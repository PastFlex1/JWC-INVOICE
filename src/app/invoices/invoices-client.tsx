'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, Copy, Send, Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Invoice, Customer, CreditNote, DebitNote, Payment, BunchItem } from '@/lib/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { deleteInvoice } from '@/services/invoices';
import { useToast } from '@/hooks/use-toast';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';

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

const ITEMS_PER_PAGE = 10;

export function InvoicesClient() {
  const { invoices, customers, creditNotes, debitNotes, payments, refreshData } = useAppData();
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { t } = useTranslation();

  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.id] = customer;
      return acc;
    }, {} as Record<string, Customer>);
  }, [customers]);

  const notesAndPaymentsByInvoiceId = useMemo(() => {
    const result: Record<string, { credits: number; debits: number; payments: number }> = {};
    
    invoices.forEach(inv => {
      result[inv.id] = { credits: 0, debits: 0, payments: 0 };
    });

    creditNotes.forEach(note => {
      if (result[note.invoiceId]) {
        result[note.invoiceId].credits += note.amount;
      }
    });

    debitNotes.forEach(note => {
      if (result[note.invoiceId]) {
        result[note.invoiceId].debits += note.amount;
      }
    });

    payments.forEach(payment => {
      if (result[payment.invoiceId]) {
        result[payment.invoiceId].payments += payment.amount;
      }
    });

    return result;
  }, [invoices, creditNotes, debitNotes, payments]);

  const filteredInvoices = useMemo(() => {
    const saleInvoices = invoices.filter(inv => inv.type === 'sale' || inv.type === 'both');
    
    let filtered = saleInvoices;

    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      filtered = filtered.filter(invoice => 
        isWithinInterval(parseISO(invoice.farmDepartureDate), range)
      );
    }
    
    return filtered.filter(invoice => {
        const customerName = customerMap[invoice.customerId]?.name || '';
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        
        if (!lowerCaseSearch) return true;

        const searchFields = [
            invoice.invoiceNumber,
            customerName,
            invoice.status,
        ];

        return searchFields.some(field => field.toLowerCase().includes(lowerCaseSearch));
    });
  }, [invoices, debouncedSearchTerm, customerMap, dateRange]);


  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));


  const getCustomer = (customerId: string): Customer | null => {
    return customerMap[customerId] || null;
  };

  const getInvoiceBalance = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            return bunchAcc + (stems * bunch.salePrice);
        }, 0);
    }, 0);

    const { credits, debits, payments: totalPayments } = notesAndPaymentsByInvoiceId[invoice.id] || { credits: 0, debits: 0, payments: 0 };
    
    return subtotal + debits - credits - totalPayments;
  };

  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice(invoiceToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('invoices.toast.deleted') });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorDeleting'),
        description: t('invoices.toast.deleteError', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setInvoiceToDelete(null);
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('invoices.title')}</h2>
            <p className="text-muted-foreground">{t('invoices.description')}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('invoices.history')}</CardTitle>
            <CardDescription>{t('invoices.historyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('invoices.searchPlaceholder')}
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
                      <span>Todas las fechas</span>
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
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button variant="ghost" onClick={() => setDateRange(undefined)}>
                    <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.invoiceNumber')}</TableHead>
                    <TableHead>{t('invoices.customer')}</TableHead>
                    <TableHead>Fecha Salida</TableHead>
                    <TableHead>{t('invoices.amount')}</TableHead>
                    <TableHead>{t('invoices.status')}</TableHead>
                    <TableHead className="text-right">{t('invoices.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => {
                    const balance = getInvoiceBalance(invoice);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{getCustomer(invoice.customerId)?.name || t('invoices.unknownCustomer')}</TableCell>
                        <TableCell>{format(parseISO(invoice.farmDepartureDate), 'PPP')}</TableCell>
                        <TableCell>${balance.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={invoice.status === 'Paid' ? 'secondary' : invoice.status === 'Overdue' ? 'destructive' : 'outline'}
                            className={cn({
                              'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300': invoice.status === 'Paid',
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300': invoice.status === 'Pending',
                            })}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/invoices/${invoice.id}`} passHref>
                              <Button variant="ghost" size="icon" title="Ver/Enviar Factura">
                                <Send className="h-4 w-4" />
                                <span className="sr-only">Ver/Enviar Factura</span>
                              </Button>
                            </Link>
                             <Link href={`/invoices/new?edit=${invoice.id}`} passHref>
                              <Button variant="ghost" size="icon" title="Editar Factura">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar Factura</span>
                              </Button>
                            </Link>
                            <Link href={`/invoices/new?duplicate=${invoice.id}`} passHref>
                              <Button variant="ghost" size="icon" title="Duplicar Factura">
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Duplicar Factura</span>
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(invoice)} title={t('invoices.deleteTooltip')}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">{t('invoices.deleteTooltip')}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('common.page', { currentPage: currentPage, totalPages: totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
