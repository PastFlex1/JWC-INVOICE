'use client';

import { useState, useMemo } from 'react';
import { useAppData } from '@/context/app-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Finca, Invoice, CreditNote, DebitNote, BunchItem } from '@/lib/types';
import { HistoricalFarmAccountStatementView } from './historical-farm-account-statement-view';
import HistoricalFarmAccountStatementDownloadButton from './historical-farm-account-statement-download';
import HistoricalFarmAccountStatementExcelButton from './historical-farm-account-statement-download-excel';
import HistoricalSendFarmDocumentsDialog from './historical-farm-send-documents-dialog';
import { useTranslation } from '@/context/i18n-context';

export type StatementData = {
  finca: Finca;
  invoices: (Invoice & { total: number; balance: number; credits: number; debits: number; payments: number; })[];
  totalOutstanding: number;
  totalCredits: number;
  totalDebits: number;
  totalPayments: number;
  urgentPayment: number;
  statementDate: string;
};

export function HistoricalFarmAccountStatementClient() {
  const { fincas, invoices, creditNotes, debitNotes, payments } = useAppData();
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { t } = useTranslation();

  const statementData = useMemo((): StatementData | null => {
    if (!selectedFincaId) return null;

    const finca = fincas.find(f => f.id === selectedFincaId);
    if (!finca) return null;

    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'));
    
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

      const creditsForInvoice = creditNotes.filter(cn => cn.invoiceId === invoice.id);
      const debitsForInvoice = debitNotes.filter(dn => dn.invoiceId === invoice.id);
      const paymentsForInvoice = payments.filter(p => p.invoiceId === invoice.id);

      const totalCredits = creditsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalDebits = debitsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalPayments = paymentsForInvoice.reduce((acc, payment) => acc + payment.amount, 0);
      
      const totalCharge = invoiceSubtotal + totalDebits;
      const balance = totalCharge - totalCredits - totalPayments;
      
      return {
        ...invoice,
        total: totalCharge,
        credits: totalCredits,
        debits: totalDebits,
        payments: totalPayments,
        balance,
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
  }, [selectedFincaId, fincas, invoices, creditNotes, debitNotes, payments]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Estado de Cuenta Histórico de Finca</h2>
            <p className="text-muted-foreground">Vea el historial completo de un proveedor.</p>
          </div>
          {statementData && (
             <div className="flex gap-2">
                <HistoricalFarmAccountStatementDownloadButton data={statementData} />
                <HistoricalFarmAccountStatementExcelButton data={statementData} />
                <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>Enviar Documentos</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Finca</CardTitle>
            <CardDescription>Elija una finca/proveedor para generar su estado de cuenta histórico.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        
        {statementData && statementData.invoices.length > 0 && (
          <HistoricalFarmAccountStatementView data={statementData} />
        )}

        {selectedFincaId && (!statementData || statementData.invoices.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No se encontraron facturas para la finca seleccionada.</p>
          </div>
        )}

        {!selectedFincaId && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Por favor, seleccione una finca para continuar.</p>
          </div>
        )}
      </div>
      
      {statementData && (
        <HistoricalSendFarmDocumentsDialog 
          isOpen={isSendDialogOpen}
          onClose={() => setIsSendDialogOpen(false)}
          finca={statementData.finca}
        />
      )}
    </>
  );
}
