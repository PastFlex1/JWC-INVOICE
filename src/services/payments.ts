
import { db } from '@/lib/firebase';
import type { Payment, Invoice, CreditNote, DebitNote, BunchItem } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  runTransaction,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  getDoc,
  writeBatch,
  WriteBatch,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const paymentFromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Payment => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  
  const paymentDate = data.paymentDate instanceof Timestamp 
    ? data.paymentDate.toDate().toISOString() 
    : data.paymentDate;

  return {
    id: snapshot.id,
    invoiceId: data.invoiceId,
    amount: data.amount,
    paymentDate: paymentDate,
    paymentMethod: data.paymentMethod,
    reference: data.reference,
    notes: data.notes,
    type: data.type || 'sale',
  };
};

export async function getPayments(): Promise<Payment[]> {
  if (!db) return [];
  const paymentsCollection = collection(db, 'payments');
  const snapshot = await getDocs(paymentsCollection);
  return snapshot.docs.map(paymentFromFirestore);
}

export async function getPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
  if (!db) return [];
  const paymentsCollection = collection(db, 'payments');
  const q = query(paymentsCollection, where("invoiceId", "==", invoiceId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(paymentFromFirestore);
}

async function recalculateInvoiceStatus(transaction: any, invoiceId: string, paymentType: 'sale' | 'purchase') {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (!invoiceDoc.exists()) {
        console.error(`Invoice ${invoiceId} not found during recalculation.`);
        return;
    }
    
    const invoiceData = invoiceDoc.data() as Invoice;

    // Fetch associated financial records within the same transaction if possible,
    // or assume they are passed if not. For client-side, we must re-fetch outside.
    // This simplified version only considers the payment being changed. A full re-fetch client-side is better.
    const dueDate = new Date(invoiceData.farmDepartureDate);
    // Assuming a standard 30-day payment term for status calculation
    dueDate.setDate(dueDate.getDate() + 30); 
    const newStatus = new Date() > dueDate ? 'Overdue' : 'Pending';

    const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};

    if (paymentType === 'sale' && invoiceData.saleStatus === 'Paid') {
      updatePayload.saleStatus = newStatus;
    } else if (paymentType === 'purchase' && invoiceData.purchaseStatus === 'Paid') {
      updatePayload.purchaseStatus = newStatus;
    }
    
    if (Object.keys(updatePayload).length > 0) {
        transaction.update(invoiceRef, updatePayload);
    }
}


export async function addBulkPayment(
  paymentData: Omit<Payment, 'id' | 'invoiceId' | 'amount'>, 
  invoicesToPay: { invoiceId: string; balance: number; amountToPay: number; type: 'sale' | 'purchase' | 'both', farmDepartureDate: string }[],
  bankFee?: number,
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");

  const batch = writeBatch(db);

  if (bankFee && bankFee > 0 && invoicesToPay.length > 0) {
    const firstInvoice = invoicesToPay[0];
    const creditNoteRef = doc(collection(db, 'creditNotes'));
    const creditNoteData = {
      invoiceId: firstInvoice.invoiceId,
      amount: bankFee,
      reason: 'Costo Bancario',
      date: new Date(paymentData.paymentDate),
      type: paymentData.type,
      invoiceNumber: (await getDoc(doc(db, 'invoices', firstInvoice.invoiceId))).data()?.invoiceNumber || '',
    };
    batch.set(creditNoteRef, creditNoteData);
  }

  for (const invoice of invoicesToPay) {
    if (invoice.amountToPay <= 0) continue;

    const newPaymentRef = doc(collection(db, 'payments'));
    const newPaymentData = {
      ...paymentData,
      invoiceId: invoice.invoiceId,
      amount: invoice.amountToPay,
      paymentDate: new Date(paymentData.paymentDate),
    };
    batch.set(newPaymentRef, newPaymentData);

    let newBalance = invoice.balance - invoice.amountToPay;
    if (bankFee && bankFee > 0 && invoice.invoiceId === invoicesToPay[0].invoiceId) {
        newBalance -= bankFee;
    }

    const isPaid = newBalance <= 0.01;
    const dueDate = new Date(invoice.farmDepartureDate);
    dueDate.setDate(dueDate.getDate() + 30); // Assuming 30 days payment term
    const newStatus = isPaid ? 'Paid' : (new Date() > dueDate ? 'Overdue' : 'Pending');

    const invoiceRef = doc(db, 'invoices', invoice.invoiceId);
    const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};
    
    if (paymentData.type === 'sale') {
        updatePayload.saleStatus = newStatus;
    } else if (paymentData.type === 'purchase') {
        updatePayload.purchaseStatus = newStatus;
    }

    if (Object.keys(updatePayload).length > 0) {
      batch.update(invoiceRef, updatePayload);
    }
  }

  await batch.commit();
}


export async function deleteAggregatedPayment(paymentIds: string[]): Promise<void> {
    if (!db) throw new Error("Firebase is not configured.");

    await runTransaction(db, async (transaction) => {
        const affectedInvoiceIds = new Set<string>();
        const paymentsToDelete: { ref: DocumentSnapshot<DocumentData>, data: Payment }[] = [];

        for (const paymentId of paymentIds) {
            const paymentRef = doc(db, 'payments', paymentId);
            const paymentDoc = await transaction.get(paymentRef);
            if (paymentDoc.exists()) {
                const paymentData = paymentFromFirestore(paymentDoc as QueryDocumentSnapshot<DocumentData>);
                affectedInvoiceIds.add(paymentData.invoiceId);
                paymentsToDelete.push({ ref: paymentDoc, data: paymentData });
            }
        }
        
        for (const { ref } of paymentsToDelete) {
            transaction.delete(ref.ref);
        }

        for (const invoiceId of affectedInvoiceIds) {
            const paymentType = paymentsToDelete.find(p => p.data.invoiceId === invoiceId)?.data.type;
            if (paymentType) {
              await recalculateInvoiceStatus(transaction, invoiceId, paymentType);
            }
        }
    });
}

export async function deleteSinglePayment(paymentId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not configured.");

    await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, 'payments', paymentId);
        const paymentDoc = await transaction.get(paymentRef);

        if (paymentDoc.exists()) {
            const paymentData = paymentFromFirestore(paymentDoc as QueryDocumentSnapshot<DocumentData>);
            transaction.delete(paymentRef);
            await recalculateInvoiceStatus(transaction, paymentData.invoiceId, paymentData.type);
        }
    });
}

export async function updateSinglePayment(paymentId: string, newAmount: number): Promise<void> {
    if (!db) throw new Error("Firebase is not configured.");

    await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, 'payments', paymentId);
        const paymentDoc = await transaction.get(paymentRef);

        if (paymentDoc.exists()) {
            const paymentData = paymentFromFirestore(paymentDoc as QueryDocumentSnapshot<DocumentData>);
            transaction.update(paymentRef, { amount: newAmount });
            // Status will be 'Pending' or 'Overdue', can't be 'Paid' if we are just editing one part.
            // A full client-side recalculation after this operation is the safest.
            await recalculateInvoiceStatus(transaction, paymentData.invoiceId, paymentData.type);
        }
    });
}
