
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/context/app-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Finca, Invoice, CreditNote, DebitNote, BunchItem, Customer, Consignatario } from '@/lib/types';
import { FarmAccountStatementView } from './farm-account-statement-view';
import FarmAccountStatementDownloadButton from './farm-account-statement-download';
import FarmAccountStatementExcelButton from './farm-account-statement-download-excel';
import SendFarmDocumentsDialog from './send-documents-dialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export type StatementData = {
  finca: Finca;
  invoices: (Invoice & { total: number; balance: number; credits: number; debits: number; payments: number; consigneeName?: string; })[];
  totalOutstanding: number;
  totalCredits: number;
  totalDebits: number;
  totalPayments: number;
  urgentPayment: number;
  statementDate: string;
};

export function FarmAccountStatementClient() {
  const { fincas, invoices, creditNotes, debitNotes, payments, customers, consignatarios } = useAppData();
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);

  const availableMonths = useMemo(() => {
    if (!selectedFincaId) return [];
    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'));

    if (selectedCustomerId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.customerId === selectedCustomerId);
    }
    
    const months = new Set(fincaInvoices.map(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM')));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [selectedFincaId, selectedCustomerId, invoices]);

  useEffect(() => {
    setSelectedMonth('all');
    setSelectedCustomerId(null);
  }, [selectedFincaId]);

  useEffect(() => {
    setSelectedMonth('all');
  }, [selectedCustomerId]);


  const statementData = useMemo((): StatementData | null => {
    if (!selectedFincaId) return null;

    const finca = fincas.find(f => f.id === selectedFincaId);
    if (!finca) return null;

    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both') && inv.status !== 'Paid');
    
    if (selectedCustomerId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.customerId === selectedCustomerId);
    }

    if (selectedMonth !== 'all') {
      fincaInvoices = fincaInvoices.filter(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM') === selectedMonth);
    }
    
    if (fincaInvoices.length === 0) return null;
    
    const sortedInvoices = fincaInvoices.sort((a, b) => new Date(b.farmDepartureDate).getTime() - new Date(a.farmDepartureDate).getTime());
    const latestInvoiceDate = sortedInvoices[0].farmDepartureDate;

    const processedInvoices = fincaInvoices.map(invoice => {
       const invoiceSubtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            return bunchAcc + (stems * bunch.purchasePrice);
        }, 0);
      }, 0);

      const creditsForInvoice = creditNotes.filter(cn => cn.invoiceId === invoice.id && cn.type === 'purchase');
      const debitsForInvoice = debitNotes.filter(dn => dn.invoiceId === invoice.id && dn.type === 'purchase');
      const paymentsForInvoice = payments.filter(p => p.invoiceId === invoice.id && p.type === 'purchase');

      const totalCredits = creditsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalDebits = debitsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalPayments = paymentsForInvoice.reduce((sum, payment) => sum + payment.amount, 0);
      
      const totalCharge = invoiceSubtotal + totalDebits;
      const balance = totalCharge - totalCredits - totalPayments;
      
      const consigneeName = invoice.consignatarioId ? consignatarioMap.get(invoice.consignatarioId) : customerMap.get(invoice.customerId);


      return {
        ...invoice,
        total: totalCharge,
        credits: totalCredits,
        debits: totalDebits,
        payments: totalPayments,
        balance,
        consigneeName,
      };
    });
    
    const totalOutstanding = processedInvoices.reduce((acc, inv) => acc + inv.balance, 0);
    const totalCredits = processedInvoices.reduce((acc, inv) => acc + inv.credits, 0);
    const totalDebits = processedInvoices.reduce((acc, inv) => acc + inv.debits, 0);
    const totalPayments = processedInvoices.reduce((acc, inv) => acc + inv.payments, 0);

    const urgentPayment = processedInvoices
        .filter(inv => inv.status === 'Overdue')
        .reduce((acc, inv) => acc + inv.balance, 0);

    return {
      finca,
      invoices: processedInvoices.sort((a, b) => new Date(a.farmDepartureDate).getTime() - new Date(b.farmDepartureDate).getTime()),
      totalOutstanding,
      totalCredits,
      totalDebits,
      totalPayments,
      urgentPayment,
      statementDate: latestInvoiceDate,
    };
  }, [selectedFincaId, selectedCustomerId, selectedMonth, fincas, invoices, creditNotes, debitNotes, payments, customerMap, consignatarioMap]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Estado de Cuenta de Finca</h2>
            <p className="text-muted-foreground">Seleccione una finca para ver su estado de cuenta detallado.</p>
          </div>
          {statementData && (
             <div className="flex gap-2">
                <FarmAccountStatementDownloadButton data={statementData} />
                <FarmAccountStatementExcelButton data={statementData} />
                <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>Enviar Documentos</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Finca</CardTitle>
            <CardDescription>Elija una finca/proveedor de la lista para generar su estado de cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Select onValueChange={setSelectedFincaId}>
              <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                <SelectValue placeholder="Seleccione una finca..." />
              </SelectTrigger>
              <SelectContent>
                {fincas.map(finca => (
                  <SelectItem key={finca.id} value={finca.id}>
                    {finca.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedFincaId && (
              <Select onValueChange={(value) => setSelectedCustomerId(value === 'all' ? null : value)}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                  <SelectValue placeholder="Filtrar por cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Clientes</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedFincaId && availableMonths.length > 0 && (
              <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                  <SelectValue placeholder="Filtrar por mes..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Meses</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(parseISO(`${month}-02`), "MMMM yyyy", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
        
        {statementData && statementData.invoices.length > 0 && (
          <FarmAccountStatementView data={statementData} />
        )}

        {selectedFincaId && (!statementData || statementData.invoices.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
                <p>No se encontraron facturas para el período seleccionado.</p>
            </div>
        )}

        {!selectedFincaId && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Por favor, seleccione una finca para continuar.</p>
          </div>
        )}
      </div>
       
      {statementData && (
        <SendFarmDocumentsDialog 
          isOpen={isSendDialogOpen}
          onClose={() => setIsSendDialogOpen(false)}
          finca={statementData.finca}
          invoices={statementData.invoices}
        />
      )}
    </>
  );
}
