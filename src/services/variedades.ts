

import { db } from '@/lib/firebase';
import type { Variedad } from '@/lib/types';
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

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Variedad => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  return {
    id: snapshot.id,
    nombre: data.nombre,
  };
};

export async function getVariedades(): Promise<Variedad[]> {
  if (!db) return [];
  const variedadesCollection = collection(db, 'variedades');
  const snapshot = await getDocs(variedadesCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function addVariedad(variedadData: Omit<Variedad, 'id'>): Promise<string> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");
  const variedadesCollection = collection(db, 'variedades');
  const docRef = await addDoc(variedadesCollection, variedadData);
  return docRef.id;
}

export async function updateVariedad(id: string, variedadData: Partial<Omit<Variedad, 'id'>>): Promise<void> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");
  const variedadDoc = doc(db, 'variedades', id);
  await updateDoc(variedadDoc, variedadData);
}

export async function deleteVariedad(id: string): Promise<void> {
  if (!db) throw new Error("Firebase is not configured. Check your .env file.");
  const variedadDoc = doc(db, 'variedades', id);
  await deleteDoc(variedadDoc);
}

