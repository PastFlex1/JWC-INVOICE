'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, X as XIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Payment, Invoice, Customer, Finca } from '@/lib/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { PaymentReceiptView } from './payment-receipt-view';
import { SendPaymentReceiptDialog } from './send-payment-receipt-dialog';
import { ViewPaymentsView } from './view-payments-view';
import { deleteAggregatedPayment } from '@/services/payments';
import { useToast } from '@/hooks/use-toast';


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export type PaymentDetail = {
    paymentId: string;
    invoiceNumber: string;
    amount: number;
    customerName: string;
    consigneeName: string;
};

export type AggregatedPayment = {
    id: string;
    paymentDate: string;
    entityName: string;
    entityEmail: string | undefined;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    reference?: string;
    notes?: string;
    details: PaymentDetail[];
};

export function ViewPaymentsClient() {
  const { payments, invoices, customers, fincas, consignatarios, refreshData } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedPayment, setSelectedPayment] = useState<AggregatedPayment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<AggregatedPayment | null>(null);
  const [paymentToSend, setPaymentToSend] = useState<AggregatedPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const { t } = useTranslation();

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f])), [fincas]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);
  const invoiceMap = useMemo(() => new Map(invoices.map(i => [i.id, i])), [invoices]);

  const aggregatedPayments = useMemo(() => {
      const groupedPayments: Record<string, AggregatedPayment> = {};

      payments.forEach(p => {
          const invoice = invoiceMap.get(p.invoiceId);
          if (!invoice) return;

          let entityId: string | null = null;
          let entity: Customer | Finca | undefined;
          
          if (p.type === 'purchase') {
              entityId = invoice.farmId;
              entity = fincaMap.get(entityId);
          } else { // 'sale' or 'both' for a customer payment
              entityId = invoice.customerId;
              entity = customerMap.get(entityId);
          }

          if (!entityId || !entity) return;

          const paymentDateStr = format(parseISO(p.paymentDate), 'yyyy-MM-dd');
          const groupKey = `${paymentDateStr}-${entityId}-${p.paymentMethod}-${p.reference || ''}`;

          if (!groupedPayments[groupKey]) {
              groupedPayments[groupKey] = {
                  id: groupKey,
                  paymentDate: p.paymentDate,
                  entityName: entity.name,
                  entityEmail: 'email' in entity ? entity.email : undefined,
                  amount: 0,
                  paymentMethod: p.paymentMethod,
                  reference: p.reference,
                  notes: p.notes,
                  details: [],
              };
          }

          const customerName = customerMap.get(invoice.customerId)?.name || t('invoices.unknownCustomer');
          const consigneeName = invoice.consignatarioId ? (consignatarioMap.get(invoice.consignatarioId) || 'Consignatario Desconocido') : customerName;

          groupedPayments[groupKey].amount += p.amount;
          groupedPayments[groupKey].details.push({
            paymentId: p.id,
            invoiceNumber: invoice.invoiceNumber, 
            amount: p.amount,
            customerName: customerName,
            consigneeName: consigneeName
          });
      });

      return Object.values(groupedPayments).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
  }, [payments, invoices, customerMap, fincaMap, invoiceMap, consignatarioMap, t]);

  const filteredPayments = useMemo(() => {
    let filtered = aggregatedPayments;

    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      filtered = filtered.filter(p => isWithinInterval(parseISO(p.paymentDate), range));
    }
    
    return filtered.filter(payment => {
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        if (!lowerCaseSearch) return true;
        const invoiceNumbers = payment.details.map(d => d.invoiceNumber);
        const searchFields = [
            payment.entityName, 
            payment.paymentMethod, 
            payment.reference || '',
            ...invoiceNumbers
        ];
        return searchFields.some(field => field.toLowerCase().includes(lowerCaseSearch));
    });
  }, [aggregatedPayments, debouncedSearchTerm, dateRange]);
  
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);

    const paymentIds = paymentToDelete.details.map(d => d.paymentId);
    
    try {
      await deleteAggregatedPayment(paymentIds);
      toast({
        title: t('common.success'),
        description: t('viewPayments.toast.deleteSuccess'),
      });
      await refreshData();
      setPaymentToDelete(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: t('common.errorDeleting'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <>
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight font-headline">{t('viewPayments.title')}</h2>
                <p className="text-muted-foreground">{t('viewPayments.description')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('viewPayments.registeredPayments')}</CardTitle>
                    <CardDescription>{t('viewPayments.registeredPaymentsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-wrap gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder={t('viewPayments.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        />
                    </div>
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
                            numberOfMonths={1}
                        />
                        </PopoverContent>
                    </Popover>
                    {dateRange && (
                        <Button variant="ghost" onClick={() => setDateRange(undefined)}>
                            <XIcon className="h-4 w-4" />
                        </Button>
                    )}
                    </div>
                    <ViewPaymentsView 
                      payments={filteredPayments}
                      onViewPayment={setSelectedPayment}
                      onSendPayment={setPaymentToSend}
                      onDeletePayment={setPaymentToDelete}
                    />
                </CardContent>
            </Card>
        </div>

        <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <AlertDialogContent className="sm:max-w-4xl">
                 <AlertDialogHeader>
                    <AlertDialogTitle>{t('viewPayments.receipt.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('viewPayments.receipt.description', { entityName: selectedPayment?.entityName || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 {selectedPayment && (
                    <div id={`payment-receipt-container-${selectedPayment.id}`} className="max-h-[60vh] overflow-y-auto">
                        <PaymentReceiptView payment={selectedPayment} />
                    </div>
                 )}
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedPayment(null)}>{t('viewPayments.receipt.close')}</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {paymentToSend && (
            <SendPaymentReceiptDialog
                isOpen={!!paymentToSend}
                onClose={() => setPaymentToSend(null)}
                payment={paymentToSend}
            />
        )}
        
        <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('viewPayments.toast.confirmDeleteDescription')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePayment} variant="destructive" disabled={isDeleting}>
                    {isDeleting ? t('common.deleting') : t('common.delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
