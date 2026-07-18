
export interface Customer {
  id: string;
  type: 'National' | 'International';
  name: string;
  cedula: string;
  pais: string;
  estadoCiudad: string;
  address: string;
  email: string;
  phone: string;
  agencia: string;
  vendedor: string;
  plazo: number;
  cupo: number;
  tipoControl: 'Ninguna' | 'Advertencia' | 'BloquearMonto' | 'BloquearVencidas' | 'BloquearMontoVencidas';
  daeId?: string;
}

export interface BunchItem {
  id: string;
  productoId: string;
  product: string; 
  color: string;
  variety: string; 
  length: string;
  stemsPerBunch: number;
  bunchesPerBox: number;
  purchasePrice: number;
  salePrice: number;
}

export interface LineItem {
  id: string;
  numberOfBoxes: number;
  boxType: 'qb' | 'eb' | 'hb' | 'jhb';
  numberOfBunches: number;
  bunches: BunchItem[];
}

export interface Invoice {
  id: string;
  type: 'sale' | 'purchase' | 'both';
  invoiceNumber: string;
  farmDepartureDate: string;
  flightDate: string;
  sellerId?: string;
  customerId: string;
  consignatarioId: string;
  farmId: string;
  carrierId: string;
  countryId: string;
  reference?: string;
  masterAWB: string;
  houseAWB: string;
  items: LineItem[];
  saleStatus: 'Paid' | 'Pending' | 'Overdue' | 'N/A';
  purchaseStatus: 'Paid' | 'Pending' | 'Overdue' | 'N/A';
}


export interface Finca {
  id:string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  taxId: string;
  productType: string;
}

export interface Vendedor {
  id: string;
  nombre: string;
  siglas: string;
}

export interface Marcacion {
  id: string;
  numeroMarcacion: string;
  cliente: string;
}

export interface Pais {
  id: string;
  nombre: string;
}

export interface Provincia {
  id: string;
  nombre: string;
}

export interface Dae {
  id: string;
  pais: string;
  numeroDae: string;
}

export interface Carguera {
  id: string;
  nombreCarguera: string;
  pais: string;
}

export interface Consignatario {
  id: string;
  nombreConsignatario: string;
  pais: string;
  customerId: string;
  direccion: string;
  provincia: string;
  carrierId?: string;
}

export interface Variedad {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  nombre: string;
  variedad: string;
  barras: string;
  color: string;
  nombreColor: string;
  precio: number;
  tallosPorRamo: number;
  estado: 'Activo' | 'Inactivo';
}


export interface CreditNote {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  reason: string;
  date: string; // ISO string
  type: 'sale' | 'purchase';
}

export interface DebitNote {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  reason: string;
  date: string; // ISO string
  type: 'sale' | 'purchase';
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string; // ISO string
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Transferencia Internacional';
  type: 'sale' | 'purchase';
  reference?: string;
  notes?: string;
}

export type Financials = {
    payments: Payment[];
    creditNotes: CreditNote[];
    debitNotes: DebitNote[];
};

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

export interface EmailMessage {
  id: string;
  messageId?: string;
  uid?: number;
  type: "inbox" | "sent";
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  date: string;
  isRead: boolean;
  status?: "delivered" | "bounced" | "pending";
  threadId?: string;
  attachments?: EmailAttachment[];
  createdBy?: string;
  createdAt?: string;
}
