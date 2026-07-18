import { db } from '@/lib/firebase';
import type { Finca } from '@/lib/types';
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

// Helper function to convert a Firestore document to our Finca type
const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Finca => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name,
    address: data.address,
    phone: data.phone,
    email: data.email,
    taxId: data.taxId,
    productType: data.productType,
  };
};

/**
 * Fetches all fincas from the Firestore collection.
 * @returns A promise that resolves to an array of Finca objects.
 */
export async function getFincas(): Promise<Finca[]> {
  const fincasCollection = collection(db, 'fincas');
  const snapshot = await getDocs(fincasCollection);
  return snapshot.docs.map(fromFirestore);
}

/**
 * Adds a new finca to the Firestore collection.
 * @param fincaData - The finca data to add (without an id).
 * @returns A promise that resolves to the new document's id.
 */
export async function addFinca(fincaData: Omit<Finca, 'id'>): Promise<string> {
  const fincasCollection = collection(db, 'fincas');
  const docRef = await addDoc(fincasCollection, fincaData);
  return docRef.id;
}

/**
 * Updates an existing finca in the Firestore collection.
 * @param id - The id of the finca to update.
 * @param fincaData - An object with the finca fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateFinca(id: string, fincaData: Partial<Omit<Finca, 'id'>>): Promise<void> {
  const fincaDoc = doc(db, 'fincas', id);
  await updateDoc(fincaDoc, fincaData);
}

/**
 * Deletes a finca from the Firestore collection.
 * @param id - The id of the finca to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteFinca(id: string): Promise<void> {
  const fincaDoc = doc(db, 'fincas', id);
  await deleteDoc(fincaDoc);
}
<<<<<<< HEAD

export function subscribeFincas(callback: (fincas: Finca[]) => void) {
  const fincasCollection = collection(db, 'fincas');
  return onSnapshot(fincasCollection, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}
=======
>>>>>>> origin/main
