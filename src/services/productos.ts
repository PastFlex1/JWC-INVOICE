import { db } from '@/lib/firebase';
import type { Producto } from '@/lib/types';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Producto => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  return {
    id: snapshot.id,
    nombre: data.nombre || '',
    variedad: data.variedad || '',
    barras: data.barras || '',
    color: data.color || '#000000',
    nombreColor: data.nombreColor || '',
    precio: data.precio || 0,
    tallosPorRamo: data.tallosPorRamo || 0,
    estado: data.estado || 'Activo',
  };
};

export async function getProductos(): Promise<Producto[]> {
  const productosCollection = collection(db, 'productos');
  const snapshot = await getDocs(productosCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function addProducto(productoData: Omit<Producto, 'id'>): Promise<string> {
  const productosCollection = collection(db, 'productos');
  const docRef = await addDoc(productosCollection, productoData);
  return docRef.id;
}

export async function updateProducto(id: string, productoData: Partial<Omit<Producto, 'id'>>): Promise<void> {
  const productoDoc = doc(db, 'productos', id);
  await updateDoc(productoDoc, productoData);
}

export async function deleteProducto(id: string): Promise<void> {
  const productoDoc = doc(db, 'productos', id);
  await deleteDoc(productoDoc);
}

export function subscribeProductos(callback: (productos: Producto[]) => void) {
  const productosCollection = collection(db, 'productos');
  return onSnapshot(productosCollection, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}
