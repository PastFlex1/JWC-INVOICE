'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/context/app-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Customer, Invoice, CreditNote, DebitNote, BunchItem, Consignatario } from '@/lib/types';
import { AccountStatementView } from './account-statement-view';
import AccountStatementDownloadButton from './account-statement-download';
import AccountStatementExcelButton from './account-statement-download-excel';
import SendDocumentsDialog from './send-documents-dialog';
import { useTranslation } from '@/context/i18n-context';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

export type StatementData = {
  customer: Customer;
  invoices: (Invoice & { total: number; balance: number; credits: number; debits: number; payments: number; consigneeName?: string; })[];
  totalOutstanding: number;
  totalCredits: number;
  totalDebits: number;
  totalPayments: number;
  urgentPayment: number;
  statementDate: string;
};

export function AccountStatementClient() {
  const { customers, invoices, creditNotes, debitNotes, payments, consignatarios } = useAppData();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);


  const consignatarioMap = useMemo(() => {
    return consignatarios.reduce((acc, c) => {
      acc[c.id] = c.nombreConsignatario;
      return acc;
    }, {} as Record<string, string>);
  }, [consignatarios]);

  const availableMonths = useMemo(() => {
    if (!selectedCustomerId) return [];
    const customerInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId && (inv.type === 'sale' || inv.type === 'both'));
    const months = new Set(customerInvoices.map(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM')));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [selectedCustomerId, invoices]);

  useEffect(() => {
    setSelectedMonth('all');
  }, [selectedCustomerId]);

  const statementData = useMemo((): StatementData | null => {
    if (!selectedCustomerId) return null;

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;

    let customerInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId && (inv.type === 'sale' || inv.type === 'both'));
    
    if (selectedMonth !== 'all') {
      customerInvoices = customerInvoices.filter(inv => format(parseISO(inv.farmDepartureDate), 'yyyy-MM') === selectedMonth);
    }
    
    let processedInvoices = customerInvoices.map(invoice => {
       const invoiceSubtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        const numberOfBoxes = item.numberOfBoxes || 1;
        const itemSubtotal = item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            return bunchAcc + (stems * bunch.salePrice);
        }, 0);
        return acc + (itemSubtotal * numberOfBoxes);
      }, 0);

      const creditsForInvoice = creditNotes.filter(cn => cn.invoiceId === invoice.id && cn.type === 'sale');
      const debitsForInvoice = debitNotes.filter(dn => dn.invoiceId === invoice.id && dn.type === 'sale');
      const paymentsForInvoice = payments.filter(p => p.invoiceId === invoice.id && p.type === 'sale');

      const totalCredits = creditsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalDebits = debitsForInvoice.reduce((acc, note) => acc + note.amount, 0);
      const totalPayments = paymentsForInvoice.reduce((acc, payment) => acc + payment.amount, 0);
      
      const totalCharge = invoiceSubtotal + totalDebits;
      const balance = totalCharge - totalCredits - totalPayments;
      
      const consigneeName = invoice.consignatarioId ? consignatarioMap[invoice.consignatarioId] : customer.name;

      return {
        ...invoice,
        total: totalCharge,
        credits: totalCredits,
        debits: totalDebits,
        payments: totalPayments,
        balance,
        consigneeName,
      };
    }).filter(inv => inv.balance > 0.01);
    
    if (processedInvoices.length === 0) return null;

    const sortedInvoices = processedInvoices.sort((a, b) => new Date(b.farmDepartureDate).getTime() - new Date(a.farmDepartureDate).getTime());
    const latestInvoiceDate = sortedInvoices[0].farmDepartureDate;

    const totalOutstanding = processedInvoices.reduce((acc, inv) => acc + inv.balance, 0);
    const totalCredits = processedInvoices.reduce((acc, inv) => acc + inv.credits, 0);
    const totalDebits = processedInvoices.reduce((acc, inv) => acc + inv.debits, 0);
    const totalPayments = processedInvoices.reduce((acc, inv) => acc + inv.payments, 0);

    const urgentPayment = processedInvoices
        .filter(inv => inv.saleStatus === 'Overdue')
        .reduce((acc, inv) => acc + inv.balance, 0);

    return {
      customer,
      invoices: processedInvoices.sort((a, b) => new Date(a.farmDepartureDate).getTime() - new Date(b.farmDepartureDate).getTime()),
      totalOutstanding,
      totalCredits,
      totalDebits,
      totalPayments,
      urgentPayment,
      statementDate: latestInvoiceDate
    };
  }, [selectedCustomerId, selectedMonth, customers, invoices, creditNotes, debitNotes, payments, consignatarioMap]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('accountStatement.title')}</h2>
            <p className="text-muted-foreground">{t('accountStatement.description')}</p>
          </div>
          {statementData && (
             <div className="flex gap-2">
                <AccountStatementDownloadButton data={statementData} />
                <AccountStatementExcelButton data={statementData} />
                <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>{t('accountStatement.sendDocuments')}</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accountStatement.selectCustomer')}</CardTitle>
            <CardDescription>{t('accountStatement.selectCustomerDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Select onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                <SelectValue placeholder={t('accountStatement.selectCustomerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCustomerId && availableMonths.length > 0 && (
              <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                  <SelectValue placeholder={t('accountStatement.filterByMonth')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accountStatement.allMonths')}</SelectItem>
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
        
        {selectedCustomerId && !statementData && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('accountStatement.noInvoices')}</p>
          </div>
        )}

        {statementData && statementData.invoices.length > 0 && (
          <AccountStatementView data={statementData} dateLocale={dateLocale} />
        )}

        {!selectedCustomerId && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('accountStatement.pleaseSelectCustomer')}</p>
          </div>
        )}
      </div>
      
      {statementData && (
        <SendDocumentsDialog 
          isOpen={isSendDialogOpen}
          onClose={() => setIsSendDialogOpen(false)}
          customer={statementData.customer}
          invoices={statementData.invoices}
        />
      )}
    </>
  );
}
