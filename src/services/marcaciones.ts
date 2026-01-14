import { db } from '@/lib/firebase';
import type { Marcacion } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Marcacion => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    numeroMarcacion: data.numeroMarcacion,
    cliente: data.cliente,
  };
};

export async function getMarcaciones(): Promise<Marcacion[]> {
  const marcacionesCollection = collection(db, 'marcaciones');
  const snapshot = await getDocs(marcacionesCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function addMarcacion(marcacionData: Omit<Marcacion, 'id'>): Promise<string> {
  const marcacionesCollection = collection(db, 'marcaciones');
  const docRef = await addDoc(marcacionesCollection, marcacionData);
  return docRef.id;
}

export async function updateMarcacion(id: string, marcacionData: Partial<Omit<Marcacion, 'id'>>): Promise<void> {
  const marcacionDoc = doc(db, 'marcaciones', id);
  await updateDoc(marcacionDoc, marcacionData);
}

export async function deleteMarcacion(id: string): Promise<void> {
  const marcacionDoc = doc(db, 'marcaciones', id);
  await deleteDoc(marcacionDoc);
}
