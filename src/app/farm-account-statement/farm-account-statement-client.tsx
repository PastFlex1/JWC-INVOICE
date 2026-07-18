
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
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/context/i18n-context';

type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "N/A";

const getStatus = (inv: Invoice): InvoiceStatus => {
  if (inv.type === "purchase") return inv.purchaseStatus ?? "N/A";
  if (inv.type === "sale") return inv.saleStatus ?? "N/A";
  return inv.purchaseStatus ?? inv.saleStatus ?? "N/A";
};

export type StatementData = {
  finca: Finca;
  invoices: (Invoice & { total: number; balance: number; credits: number; debits: number; payments: number; consigneeName?: string; status: InvoiceStatus; })[];
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
  const [selectedConsignatarioId, setSelectedConsignatarioId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);

  const availableCustomers = useMemo(() => {
    if (!selectedFincaId) return [];
    const customerIds = new Set(invoices.filter(inv => inv.farmId === selectedFincaId).map(inv => inv.customerId));
    return customers.filter(c => customerIds.has(c.id));
  }, [selectedFincaId, invoices, customers]);
  
  const availableConsignatarios = useMemo(() => {
    if (!selectedCustomerId) return [];
    const consigneeIds = new Set(consignatarios.filter(c => c.customerId === selectedCustomerId).map(c => c.id));
    return consignatarios.filter(c => consigneeIds.has(c.id));
  }, [selectedCustomerId, consignatarios]);


  const availableMonths = useMemo(() => {
    if (!selectedFincaId) return [];
    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'));
    if (selectedCustomerId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.customerId === selectedCustomerId);
    }
    if (selectedConsignatarioId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.consignatarioId === selectedConsignatarioId);
    }
    
    const months = new Set(fincaInvoices.map(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM')));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [selectedFincaId, selectedCustomerId, selectedConsignatarioId, invoices]);

  useEffect(() => {
    setSelectedCustomerId(null);
    setSelectedConsignatarioId(null);
    setSelectedMonth('all');
  }, [selectedFincaId]);

  useEffect(() => {
    setSelectedConsignatarioId(null);
    setSelectedMonth('all');
  }, [selectedCustomerId]);
  
  useEffect(() => {
    setSelectedMonth('all');
  }, [selectedConsignatarioId]);


  const statementData = useMemo((): StatementData | null => {
    if (!selectedFincaId) return null;

    const finca = fincas.find(f => f.id === selectedFincaId);
    if (!finca) return null;

    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'));
    
    if (selectedCustomerId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.customerId === selectedCustomerId);
    }
    if (selectedConsignatarioId) {
      fincaInvoices = fincaInvoices.filter(inv => inv.consignatarioId === selectedConsignatarioId);
    }

    if (selectedMonth !== 'all') {
      fincaInvoices = fincaInvoices.filter(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM') === selectedMonth);
    }
    
    let processedInvoices = fincaInvoices.map(invoice => {
       const invoiceSubtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        const numberOfBoxes = item.numberOfBoxes || 1;
        const itemSubtotal = item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const productLower = (bunch.product || '').toLowerCase();
            const isGyp = productLower.includes('gyp');
            
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            const price = bunch.purchasePrice || 0;
            
            if (isGyp) {
                return bunchAcc + (bunch.bunchesPerBox * price);
            }
            return bunchAcc + (stems * price);
        }, 0);
        return acc + (itemSubtotal * numberOfBoxes);
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
        status: getStatus(invoice),
      };
    }).filter(inv => inv.balance > 0.01);
    
    if (processedInvoices.length === 0) return null;

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
      statementDate: new Date().toISOString(),
    };
  }, [selectedFincaId, selectedCustomerId, selectedConsignatarioId, selectedMonth, fincas, invoices, creditNotes, debitNotes, payments, customerMap, consignatarioMap]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('farmAccountStatement.title')}</h2>
            <p className="text-muted-foreground">{t('farmAccountStatement.description')}</p>
          </div>
          {statementData && (
             <div className="flex gap-2">
                <FarmAccountStatementDownloadButton data={statementData} />
                <FarmAccountStatementExcelButton data={statementData} />
                <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>{t('farmAccountStatement.sendDocuments')}</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('farmAccountStatement.selectFarm')}</CardTitle>
            <CardDescription>{t('farmAccountStatement.selectFarmDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Select onValueChange={setSelectedFincaId}>
              <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                <SelectValue placeholder={t('farmAccountStatement.selectFarmPlaceholder')} />
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
              <Select onValueChange={(value) => setSelectedCustomerId(value === 'all' ? null : value)} value={selectedCustomerId || 'all'}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                  <SelectValue placeholder={t('farmAccountStatement.filterByCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('farmAccountStatement.allCustomers')}</SelectItem>
                  {availableCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedCustomerId && availableConsignatarios.length > 0 && (
              <Select onValueChange={(value) => setSelectedConsignatarioId(value === 'all' ? null : value)} value={selectedConsignatarioId || 'all'}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                  <SelectValue placeholder={t('farmAccountStatement.filterByConsignee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('farmAccountStatement.allConsignees')}</SelectItem>
                  {availableConsignatarios.map(consignatario => (
                    <SelectItem key={consignatario.id} value={consignatario.id}>
                      {consignatario.nombreConsignatario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedFincaId && availableMonths.length > 0 && (
              <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                  <SelectValue placeholder={t('farmAccountStatement.filterByMonth')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('farmAccountStatement.allMonths')}</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(parseISO(`${month}-02`), "MMMM yyyy", { locale: dateLocale })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
        
        {selectedFincaId && !statementData && (
          <div className="text-center py-12 text-muted-foreground">
              <p>{t('farmAccountStatement.noInvoices')}</p>
          </div>
        )}

        {statementData && statementData.invoices.length > 0 && (
          <FarmAccountStatementView data={statementData} />
        )}

        {!selectedFincaId && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('farmAccountStatement.pleaseSelectFarm')}</p>
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
