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
import { getInvoiceStatus } from '@/lib/due-date';
import { parseISO } from 'date-fns';

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
  const paymentsCollection = collection(db, 'payments');
  const snapshot = await getDocs(paymentsCollection);
  return snapshot.docs.map(paymentFromFirestore);
}

export async function getPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
  const paymentsCollection = collection(db, 'payments');
  const q = query(paymentsCollection, where("invoiceId", "==", invoiceId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(paymentFromFirestore);
}

async function recalculateInvoiceStatus(transaction: Transaction, invoiceId: string, paymentType: 'sale' | 'purchase') {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (!invoiceDoc.exists()) {
        console.error(`Invoice ${invoiceId} not found during recalculation.`);
        return;
    }

    const invoiceData = invoiceDoc.data() as Invoice;
    
    // This is a simplified recalculation. A full recalculation is now handled in the AppData context.
    // Here, we just mark it as pending to trigger a UI update.
    const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};

    if (paymentType === 'sale') {
      updatePayload.saleStatus = 'Pending';
    } else { // purchase
      updatePayload.purchaseStatus = 'Pending';
    }
    
    transaction.update(invoiceRef, updatePayload);
}

export async function addBulkPayment(
  paymentData: Omit<Payment, 'id' | 'invoiceId' | 'amount'>, 
  invoicesToPay: { invoiceId: string; balance: number; amountToPay: number; type: 'sale' | 'purchase' | 'both', farmDepartureDate: string }[],
  bankFee?: number,
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const invoiceDocs = new Map<string, DocumentData | undefined>();

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

      // No need to update status here, as it will be recalculated on next data fetch.
    }
  });
}


export async function deleteAggregatedPayment(paymentIds: string[]): Promise<void> {
    await runTransaction(db, async (transaction) => {
        // Phase 1: Reads (optional, as we don't need the data to just delete)
        // Phase 2: Writes
        for (const paymentId of paymentIds) {
            const paymentRef = doc(db, 'payments', paymentId);
            transaction.delete(paymentRef);
        }
        // Invoice statuses will be recalculated on the next data fetch by the client.
    });
}

export async function deleteSinglePayment(paymentId: string): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    await deleteDoc(paymentRef);
    // Status will be recalculated on next data fetch.
}

export async function updateSinglePayment(paymentId: string, newAmount: number): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, { amount: newAmount });
    // Status will be recalculated on next data fetch.
}
