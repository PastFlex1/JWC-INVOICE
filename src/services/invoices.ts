import { db } from '@/lib/firebase';
import type { Invoice, LineItem, Customer, Consignatario, Carguera, Pais } from '@/lib/types';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getCustomerById } from './customers';
import { getConsignatarioById } from './consignatarios';
import { getCargueraById } from './cargueras';
import { getPaisById } from './paises';

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Invoice => {
  const data = snapshot.data();
  if (!data) throw new Error("Document data not found");
  
  const farmDepartureDate = data.farmDepartureDate instanceof Timestamp 
    ? data.farmDepartureDate.toDate().toISOString() 
    : data.farmDepartureDate;
    
  const flightDate = data.flightDate instanceof Timestamp 
    ? data.flightDate.toDate().toISOString() 
    : data.flightDate;
  
  const items = (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
    ...item,
    numberOfBoxes: item.numberOfBoxes ?? item.boxNumber ?? 1,
  }));


  return {
    id: snapshot.id,
    type: data.type || 'sale',
    invoiceNumber: data.invoiceNumber,
    customerId: data.customerId,
    farmDepartureDate: farmDepartureDate,
    flightDate: flightDate,
    sellerId: data.sellerId,
    farmId: data.farmId,
    carrierId: data.carrierId,
    countryId: data.countryId,
    reference: data.reference,
    masterAWB: data.masterAWB,
    houseAWB: data.houseAWB,
    items: items,
    saleStatus: 'Pending', // Default status, will be recalculated in context
    purchaseStatus: 'Pending', // Default status, will be recalculated in context
    consignatarioId: data.consignatarioId,
  };
};

export async function getInvoices(): Promise<Invoice[]> {
  const invoicesCollection = collection(db, 'invoices');
  const snapshot = await getDocs(invoicesCollection);
  return snapshot.docs.map(fromFirestore);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoiceDoc = doc(db, 'invoices', id);
  const snapshot = await getDoc(invoiceDoc);
  if (snapshot.exists()) {
    return fromFirestore(snapshot);
  }
  return null;
}

type InvoiceWithDetails = {
    invoice: Invoice;
    customer: Customer | null;
    consignatario: Consignatario | null;
    carguera: Carguera | null;
    pais: Pais | null;
}

export async function getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | null> {
    const invoice = await getInvoiceById(id);
    if (!invoice) return null;

    const [customer, consignatario, carguera, pais] = await Promise.all([
        getCustomerById(invoice.customerId),
        invoice.consignatarioId ? getConsignatarioById(invoice.consignatarioId) : null,
        invoice.carrierId ? getCargueraById(invoice.carrierId) : null,
        invoice.countryId ? getPaisById(invoice.countryId) : null
    ]);

    return { invoice, customer, consignatario, carguera, pais };
}


export async function addInvoice(invoiceData: Omit<Invoice, 'id' | 'saleStatus' | 'purchaseStatus'>): Promise<string> {
   const invoicesCollection = collection(db, 'invoices');
   
   // Status is now calculated dynamically, so we don't need to set it here.
   const dataToSave = {
    ...invoiceData,
    farmDepartureDate: Timestamp.fromDate(new Date(invoiceData.farmDepartureDate)),
    flightDate: Timestamp.fromDate(new Date(invoiceData.flightDate)),
  };
  delete (dataToSave as any).status;
  delete (dataToSave as any).saleStatus;
  delete (dataToSave as any).purchaseStatus;


  const docRef = await addDoc(invoicesCollection, dataToSave);
  return docRef.id;
}

export async function updateInvoice(id: string, invoiceData: Partial<Omit<Invoice, 'id'>>): Promise<void> {
  const invoiceDoc = doc(db, 'invoices', id);
  const dataToUpdate: any = { ...invoiceData };
  
  // Status is now dynamic, so we remove it from updates.
  delete dataToUpdate.status;
  delete dataToUpdate.saleStatus;
  delete dataToUpdate.purchaseStatus;

  if (dataToUpdate.farmDepartureDate && typeof dataToUpdate.farmDepartureDate === 'string') {
    dataToUpdate.farmDepartureDate = Timestamp.fromDate(new Date(dataToUpdate.farmDepartureDate));
  }
  if (dataToUpdate.flightDate && typeof dataToUpdate.flightDate === 'string') {
    dataToUpdate.flightDate = Timestamp.fromDate(new Date(dataToUpdate.flightDate));
  }

  await updateDoc(invoiceDoc, dataToUpdate);
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoiceDoc = doc(db, 'invoices', id);
  await deleteDoc(invoiceDoc);
}

export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  const invoicesCollection = collection(db, 'invoices');
  return onSnapshot(invoicesCollection, (snapshot) => {
    callback(snapshot.docs.map(fromFirestore));
  });
}
