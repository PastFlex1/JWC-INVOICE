
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
  Transaction,
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

async function recalculateInvoiceStatus(transaction: Transaction, invoiceId: string, paymentType: 'sale' | 'purchase') {
    if (!db) throw new Error("Database not initialized");

    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (!invoiceDoc.exists()) {
        console.error(`Invoice ${invoiceId} not found during recalculation.`);
        return;
    }

    const invoiceData = invoiceDoc.data() as Invoice;

    const priceField = paymentType === 'purchase' ? 'purchasePrice' : 'salePrice';
    const subtotal = invoiceData.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0);
            return bunchAcc + (stems * (bunch[priceField] || 0));
        }, 0);
    }, 0);

    const creditNotesQuery = query(collection(db, 'creditNotes'), where('invoiceId', '==', invoiceId), where('type', '==', paymentType));
    const debitNotesQuery = query(collection(db, 'debitNotes'), where('invoiceId', '==', invoiceId), where('type', '==', paymentType));
    const paymentsQuery = query(collection(db, 'payments'), where('invoiceId', '==', invoiceId), where('type', '==', paymentType));
    
    const [creditNotesSnapshot, debitNotesSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(creditNotesQuery),
        getDocs(debitNotesQuery),
        getDocs(paymentsQuery),
    ]);

    const totalCredits = creditNotesSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalDebits = debitNotesSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    let totalPayments = paymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    // We must manually adjust for the payments being deleted in this same transaction
    // as they won't be reflected in the snapshot query. This part of the logic
    // is tricky. A simpler way is to re-calculate the balance client-side and just set status to pending.

    const totalCharge = subtotal + totalDebits;
    const balance = totalCharge - totalCredits - totalPayments;
    
    let newStatus: 'Paid' | 'Pending' | 'Overdue' = 'Pending';
    if (balance <= 0.01) {
        newStatus = 'Paid';
    } else {
        const dueDate = new Date(invoiceData.farmDepartureDate);
        dueDate.setDate(dueDate.getDate() + 30);
        if (new Date() > dueDate) {
            newStatus = 'Overdue';
        } else {
            newStatus = 'Pending';
        }
    }

    const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};

    if (paymentType === 'sale') {
      updatePayload.saleStatus = newStatus;
    } else { // purchase
      updatePayload.purchaseStatus = newStatus;
    }
    
    transaction.update(invoiceRef, updatePayload);
}

export async function addBulkPayment(
  paymentData: Omit<Payment, 'id' | 'invoiceId' | 'amount'>, 
  invoicesToPay: { invoiceId: string; balance: number; amountToPay: number; type: 'sale' | 'purchase' | 'both', farmDepartureDate: string }[],
  bankFee?: number,
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");

  await runTransaction(db, async (transaction) => {
    const invoiceDocs = new Map<string, DocumentData | undefined>();
    const invoicesToUpdate = [];

    // --- PHASE 1: READS ---
    for (const invoice of invoicesToPay) {
        if (!invoiceDocs.has(invoice.invoiceId)) {
            const invoiceRef = doc(db, 'invoices', invoice.invoiceId);
            const invoiceDoc = await transaction.get(invoiceRef);
            invoiceDocs.set(invoice.invoiceId, invoiceDoc.data());
        }
    }

    // --- PHASE 2: WRITES ---
    if (bankFee && bankFee > 0 && invoicesToPay.length > 0) {
      const firstInvoice = invoicesToPay[0];
      const creditNoteRef = doc(collection(db, 'creditNotes'));
      const invoiceData = invoiceDocs.get(firstInvoice.invoiceId);
      
      const creditNoteData = {
        invoiceId: firstInvoice.invoiceId,
        amount: bankFee,
        reason: 'Costo Bancario',
        date: new Date(paymentData.paymentDate),
        type: paymentData.type,
        invoiceNumber: invoiceData?.invoiceNumber || '',
      };
      transaction.set(creditNoteRef, creditNoteData);
      
      firstInvoice.balance -= bankFee;
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
      transaction.set(newPaymentRef, newPaymentData);

      const newBalance = invoice.balance - invoice.amountToPay;
      const isPaid = newBalance <= 0.01;
      
      const dueDate = new Date(invoice.farmDepartureDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const newStatus = isPaid ? 'Paid' : (new Date() > dueDate ? 'Overdue' : 'Pending');

      const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};
      
      if (invoice.type === 'sale' || (invoice.type === 'both' && paymentData.type === 'sale')) {
          updatePayload.saleStatus = newStatus;
      }
      if (invoice.type === 'purchase' || (invoice.type === 'both' && paymentData.type === 'purchase')) {
          updatePayload.purchaseStatus = newStatus;
      }

      if (Object.keys(updatePayload).length > 0) {
        invoicesToUpdate.push({ id: invoice.invoiceId, payload: updatePayload });
      }
    }

    for (const { id, payload } of invoicesToUpdate) {
        const invoiceRef = doc(db, 'invoices', id);
        transaction.update(invoiceRef, payload);
    }
  });
}


export async function deleteAggregatedPayment(paymentIds: string[]): Promise<void> {
    if (!db) throw new Error("Firebase is not configured.");

    await runTransaction(db, async (transaction) => {
        const affectedInvoiceIds = new Set<string>();
        const paymentsToDelete: { ref: DocumentSnapshot<DocumentData>, data: Payment }[] = [];

        // Phase 1: Reads
        for (const paymentId of paymentIds) {
            const paymentRef = doc(db, 'payments', paymentId);
            const paymentDoc = await transaction.get(paymentRef);
            if (paymentDoc.exists()) {
                const paymentData = paymentFromFirestore(paymentDoc as QueryDocumentSnapshot<DocumentData>);
                affectedInvoiceIds.add(paymentData.invoiceId);
                paymentsToDelete.push({ ref: paymentDoc, data: paymentData });
            }
        }
        
        // Phase 2: Writes
        for (const { ref } of paymentsToDelete) {
            transaction.delete(ref.ref);
        }

        // We cannot reliably recalculate status here without re-querying all related documents
        // which is not allowed after writes. So we will simply mark the invoices as 'Pending'.
        // A better approach for full accuracy would be a client-side recalculation trigger after deletion.
        for (const invoiceId of affectedInvoiceIds) {
            const paymentType = paymentsToDelete.find(p => p.data.invoiceId === invoiceId)?.data.type;
             const invoiceRef = doc(db, 'invoices', invoiceId);
             if (paymentType === 'sale') {
                transaction.update(invoiceRef, { saleStatus: 'Pending' });
            } else if (paymentType === 'purchase') {
                transaction.update(invoiceRef, { purchaseStatus: 'Pending' });
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
            
            const invoiceRef = doc(db, 'invoices', paymentData.invoiceId);
            if (paymentData.type === 'sale') {
                transaction.update(invoiceRef, { saleStatus: 'Pending' });
            } else if (paymentData.type === 'purchase') {
                transaction.update(invoiceRef, { purchaseStatus: 'Pending' });
            }
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
            
            const invoiceRef = doc(db, 'invoices', paymentData.invoiceId);
            if (paymentData.type === 'sale') {
                transaction.update(invoiceRef, { saleStatus: 'Pending' });
            } else if (paymentData.type === 'purchase') {
                transaction.update(invoiceRef, { purchaseStatus: 'Pending' });
            }
        }
    });
}
