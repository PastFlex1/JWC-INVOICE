import { db } from '@/lib/firebase';
import type { Vendedor } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
<<<<<<< HEAD
  onSnapshot,
=======
>>>>>>> origin/main
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Vendedor => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    nombre: data.nombre,
    siglas: data.siglas,
  };
};

export async function getVendedores(): Promise<Vendedor[]> {
  const vendedoresCollection = collection(db, 'vendedores');
  const snapshot = await getDocs(vendedoresCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function addVendedor(vendedorData: Omit<Vendedor, 'id'>): Promise<string> {
  const vendedoresCollection = collection(db, 'vendedores');
  const docRef = await addDoc(vendedoresCollection, vendedorData);
  return docRef.id;
}

export async function updateVendedor(id: string, vendedorData: Partial<Omit<Vendedor, 'id'>>): Promise<void> {
  const vendedorDoc = doc(db, 'vendedores', id);
  await updateDoc(vendedorDoc, vendedorData);
}

export async function deleteVendedor(id: string): Promise<void> {
  const vendedorDoc = doc(db, 'vendedores', id);
  await deleteDoc(vendedorDoc);
}
<<<<<<< HEAD

export function subscribeVendedores(callback: (vendedores: Vendedor[]) => void) {
  const vendedoresCollection = collection(db, 'vendedores');
  return onSnapshot(vendedoresCollection, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}
=======
>>>>>>> origin/main
