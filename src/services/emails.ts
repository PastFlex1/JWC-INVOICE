import { db } from '@/lib/firebase';
import type { EmailMessage } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
  onSnapshot,
  limit
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): EmailMessage => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  return {
    id: snapshot.id,
    messageId: data.messageId,
    uid: data.uid,
    type: data.type,
    from: data.from,
    to: data.to || [],
    cc: data.cc || [],
    bcc: data.bcc || [],
    subject: data.subject,
    text: data.text,
    html: data.html,
    date: data.date,
    isRead: data.isRead || false,
    status: data.status,
    threadId: data.threadId,
    attachments: data.attachments || [],
    createdBy: data.createdBy,
    createdAt: data.createdAt,
  };
};

export async function getEmails(type?: 'inbox' | 'sent'): Promise<EmailMessage[]> {
  const emailsCollection = collection(db, 'emails');
  let q = query(emailsCollection, orderBy('date', 'desc'), limit(100));
  
  if (type) {
    q = query(emailsCollection, where('type', '==', type), orderBy('date', 'desc'), limit(100));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestore);
}

export async function getEmailById(id: string): Promise<EmailMessage | null> {
  const emailDoc = doc(db, 'emails', id);
  const snapshot = await getDoc(emailDoc);
  if (snapshot.exists()) {
    return fromFirestore(snapshot);
  }
  return null;
}

export async function markEmailAsRead(id: string): Promise<void> {
  const emailDoc = doc(db, 'emails', id);
  await updateDoc(emailDoc, { isRead: true });
}

export async function addEmail(emailData: Omit<EmailMessage, 'id'>): Promise<string> {
  const emailsCollection = collection(db, 'emails');
  const docRef = await addDoc(emailsCollection, emailData);
  return docRef.id;
}

export async function deleteEmail(id: string): Promise<void> {
  const emailDoc = doc(db, 'emails', id);
  await deleteDoc(emailDoc);
}

export function subscribeEmails(type: 'inbox' | 'sent' | undefined, callback: (emails: EmailMessage[]) => void) {
  const emailsCollection = collection(db, 'emails');
  let q = query(emailsCollection, orderBy('date', 'desc'), limit(100));
  
  if (type) {
    q = query(emailsCollection, where('type', '==', type), orderBy('date', 'desc'), limit(100));
  }

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}

// Sync State
export async function getLastSyncUid(folder: string = 'INBOX'): Promise<number> {
  const syncDoc = doc(db, 'email_sync_state', folder);
  const snapshot = await getDoc(syncDoc);
  if (snapshot.exists()) {
    return snapshot.data().lastUid || 0;
  }
  return 0;
}

export async function updateLastSyncUid(folder: string, lastUid: number): Promise<void> {
  const syncDoc = doc(db, 'email_sync_state', folder);
  
  // Since updateDoc fails if document doesn't exist, we must use setDoc with merge or addDoc logic.
  // Using setDoc from firestore:
  const { setDoc } = await import('firebase/firestore');
  await setDoc(syncDoc, { lastUid, updatedAt: new Date().toISOString() }, { merge: true });
}
