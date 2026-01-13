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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { t } = useTranslation();

  const statementData = useMemo((): StatementData | null => {
    if (!selectedFincaId) return null;

    const finca = fincas.find(f => f.id === selectedFincaId);
    if (!finca) return null;

    let fincaInvoices = invoices.filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'));
    
     if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      fincaInvoices = fincaInvoices.filter(invoice => 
        isWithinInterval(parseISO(invoice.farmDepartureDate), range)
      );
    }

    if (fincaInvoices.length === 0) return null;

    const processedInvoices = fincaInvoices.map(invoice => {
       const invoiceSubtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        const numberOfBoxes = item.numberOfBoxes || 1;
        const itemSubtotal = item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            return bunchAcc + (stems * bunch.purchasePrice);
        }, 0);
        return acc + (itemSubtotal * numberOfBoxes);
      }, 0);

      const creditsForInvoice = creditNotes.filter(cn => cn.invoiceId === invoice.id && cn.type === 'purchase');
      const debitsForInvoice = debitNotes.filter(dn => dn.invoiceId === invoice.id && dn.type === 'purchase');
      const paymentsForInvoice = payments.filter(p => p.invoiceId === invoice.id && p.type === 'purchase');

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
        .filter(inv => inv.purchaseStatus === 'Overdue')
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
  }, [selectedFincaId, dateRange, fincas, invoices, creditNotes, debitNotes, payments]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('historicalFarmAccountStatement.title')}</h2>
            <p className="text-muted-foreground">{t('historicalFarmAccountStatement.description')}</p>
          </div>
          {statementData && (
             <div className="flex gap-2">
                <HistoricalFarmAccountStatementDownloadButton data={statementData} />
                <HistoricalFarmAccountStatementExcelButton data={statementData} />
                <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>{t('farmAccountStatement.sendDocuments')}</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('farmAccountStatement.selectFarm')}</CardTitle>
            <CardDescription>{t('historicalFarmAccountStatement.selectFarmDescription')}</CardDescription>
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
            <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                     {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>{t('common.allDates')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                  />
                </PopoverContent>
              </Popover>
               {dateRange && (
                <Button variant="ghost" onClick={() => setDateRange(undefined)}>
                    <XIcon className="h-4 w-4" />
                </Button>
              )}
          </CardContent>
        </Card>
        
        {statementData && statementData.invoices.length > 0 && (
          <HistoricalFarmAccountStatementView data={statementData} />
        )}

        {selectedFincaId && (!statementData || statementData.invoices.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('farmAccountStatement.noInvoices')}</p>
          </div>
        )}

        {!selectedFincaId && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('farmAccountStatement.pleaseSelectFarm')}</p>
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
