
import { db } from '@/lib/firebase';
import type { Consignatario } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Consignatario => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  return {
    id: snapshot.id,
    nombreConsignatario: data.nombreConsignatario,
    pais: data.pais,
    customerId: data.customerId,
    direccion: data.direccion || '',
    provincia: data.provincia || '',
    carrierId: data.carrierId || '',
  };
};

export async function getConsignatarios(): Promise<Consignatario[]> {
  const consignatariosCollection = collection(db, 'consignatarios');
  const snapshot = await getDocs(consignatariosCollection);
  return snapshot.docs.map(doc => fromFirestore(doc));
}

export async function getConsignatarioById(id: string): Promise<Consignatario | null> {
    const consignatarioDoc = doc(db, 'consignatarios', id);
    const snapshot = await getDoc(consignatarioDoc);
    if (snapshot.exists()) {
        return fromFirestore(snapshot);
    }
    return null;
}

export async function addConsignatario(consignatarioData: Omit<Consignatario, 'id'>): Promise<string> {
  const consignatariosCollection = collection(db, 'consignatarios');
  const docRef = await addDoc(consignatariosCollection, consignatarioData);
  return docRef.id;
}

export async function updateConsignatario(id: string, consignatarioData: Partial<Omit<Consignatario, 'id'>>): Promise<void> {
  const consignatarioDoc = doc(db, 'consignatarios', id);
  await updateDoc(consignatarioDoc, consignatarioData);
}

export async function deleteConsignatario(id: string): Promise<void> {
  const consignatarioDoc = doc(db, 'consignatarios', id);
  await deleteDoc(consignatarioDoc);
}

export function subscribeConsignatarios(callback: (consignatarios: Consignatario[]) => void) {
  const consignatariosCollection = collection(db, 'consignatarios');
  return onSnapshot(consignatariosCollection, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}
