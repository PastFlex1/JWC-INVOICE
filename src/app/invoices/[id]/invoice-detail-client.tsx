
'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useAppData } from '@/context/app-data-context';
import type { Invoice, Customer, Consignatario, Carguera, Pais, Financials } from '@/lib/types';
import { InvoiceDetailView } from './invoice-detail-view';
import { Flower2 } from 'lucide-react';

type InvoiceDetailClientProps = {
  invoiceId: string;
};

export function InvoiceDetailClient({ invoiceId }: InvoiceDetailClientProps) {
  const { invoices, customers, consignatarios, cargueras, paises, payments, creditNotes, debitNotes, isLoading } = useAppData();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHydrated(true);
    }
  }, [isLoading]);

  const invoiceData = useMemo(() => {
    if (!hydrated) return null;

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return null;

    // Ensure items and bunches have IDs for client-side key props, important for re-renders
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach(item => {
        if (!item.id) item.id = uuidv4();
        if (item.bunches && Array.isArray(item.bunches)) {
          item.bunches.forEach(bunch => {
            if (!bunch.id) bunch.id = uuidv4();
          });
        }
      });
    }

    const customer = customers.find(c => c.id === invoice.customerId) || null;
    const consignatario = invoice.consignatarioId ? consignatarios.find(c => c.id === invoice.consignatarioId) : null;
    const carguera = invoice.carrierId ? cargueras.find(c => c.id === invoice.carrierId) : null;
    const pais = invoice.countryId ? paises.find(p => p.id === invoice.countryId) : null;

    const financials: Financials = {
      payments: payments.filter(p => p.invoiceId === invoice.id),
      creditNotes: creditNotes.filter(cn => cn.invoiceId === invoice.id),
      debitNotes: debitNotes.filter(dn => dn.invoiceId === invoice.id),
    };
    
    return { invoice, customer, consignatario, carguera, pais, financials };
  }, [hydrated, invoiceId, invoices, customers, consignatarios, cargueras, paises, payments, creditNotes, debitNotes]);

  if (isLoading || !hydrated) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Flower2 className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    notFound();
  }

  return (
    <InvoiceDetailView 
      invoice={invoiceData.invoice}
      customer={invoiceData.customer}
      consignatario={invoiceData.consignatario ?? null}
      carguera={invoiceData.carguera ?? null}
      pais={invoiceData.pais ?? null}
      financials={invoiceData.financials}
    />
  );
}
