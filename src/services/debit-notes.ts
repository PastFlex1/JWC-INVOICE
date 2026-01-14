import { db } from '@/lib/firebase';
import type { DebitNote, Invoice } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): DebitNote => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  
  const date = data.date instanceof Timestamp 
    ? data.date.toDate().toISOString() 
    : data.date;

  return {
    id: snapshot.id,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber,
    amount: data.amount,
    reason: data.reason,
    date: date,
    type: data.type || 'sale',
  };
};

export async function getDebitNotes(): Promise<DebitNote[]> {
  if (!db) return [];
  const debitNotesCollection = collection(db, 'debitNotes');
  const snapshot = await getDocs(debitNotesCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function getDebitNotesForInvoice(invoiceId: string): Promise<DebitNote[]> {
  if (!db) return [];
  const debitNotesCollection = collection(db, 'debitNotes');
  const q = query(debitNotesCollection, where("invoiceId", "==", invoiceId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestore);
}

export async function addDebitNote(debitNoteData: Omit<DebitNote, 'id'>): Promise<string> {
   if (!db) throw new Error("Firebase is not configured. Check your .env file.");

   let debitNoteId = '';

   await runTransaction(db, async (transaction) => {
    // 1. Create the new debit note
    const newDebitNoteRef = doc(collection(db!, 'debitNotes'));
    const dataWithDate = {
      ...debitNoteData,
      date: new Date(debitNoteData.date),
    };
    transaction.set(newDebitNoteRef, dataWithDate);
    debitNoteId = newDebitNoteRef.id;

    // 2. Update the related invoice's status if it's 'Paid'
    const invoiceRef = doc(db!, 'invoices', debitNoteData.invoiceId);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (invoiceDoc.exists()) {
      const invoiceData = invoiceDoc.data() as Invoice;
      const updatePayload: { saleStatus?: string; purchaseStatus?: string } = {};

      if (debitNoteData.type === 'sale' && invoiceData.saleStatus === 'Paid') {
          updatePayload.saleStatus = 'Pending';
      } else if (debitNoteData.type === 'purchase' && invoiceData.purchaseStatus === 'Paid') {
          updatePayload.purchaseStatus = 'Pending';
      }
      
      if(Object.keys(updatePayload).length > 0) {
        transaction.update(invoiceRef, updatePayload);
      }
    }
   });

   if (!debitNoteId) {
    throw new Error("Failed to create debit note document.");
   }

   return debitNoteId;
}

export async function deleteDebitNote(id: string): Promise<void> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");
  const debitNoteDoc = doc(db, 'debitNotes', id);
  await deleteDoc(debitNoteDoc);
}
