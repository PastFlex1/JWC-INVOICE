
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, Copy, Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import type { Invoice, Finca, CreditNote, DebitNote, Payment, BunchItem } from '@/lib/types';
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

export function AccountsPayableClient() {
  const { invoices, fincas, creditNotes, debitNotes, payments, refreshData } = useAppData();
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fincaMap = useMemo(() => {
    return fincas.reduce((acc, finca) => {
      acc[finca.id] = finca;
      return acc;
    }, {} as Record<string, Finca>);
  }, [fincas]);

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
    const purchaseInvoices = invoices.filter(inv => inv.type === 'purchase' || inv.type === 'both');
    let filtered = purchaseInvoices;

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
        const farmName = fincaMap[invoice.farmId]?.name || '';
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        
        if (!lowerCaseSearch) return true;

        const searchFields = [
            invoice.invoiceNumber,
            farmName,
            invoice.purchaseStatus,
        ];

        return searchFields.some(field => field.toLowerCase().includes(lowerCaseSearch));
    });
  }, [invoices, debouncedSearchTerm, fincaMap, dateRange]);


  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));


  const getFinca = (farmId: string): Finca | null => {
    return fincaMap[farmId] || null;
  };

  const getInvoiceTotal = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce((acc, item) => {
        if (!item.bunches) return acc;
        const numberOfBoxes = item.numberOfBoxes || 1;
        const itemSubtotal = item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
            return bunchAcc + (stems * bunch.purchasePrice);
        }, 0);
        return acc + (itemSubtotal * numberOfBoxes);
    }, 0);
    return subtotal;
  };

  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    try {
      await deleteInvoice(invoiceToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: "La factura de compra ha sido eliminada." });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorDeleting'),
        description: `No se pudo eliminar la factura de compra: ${errorMessage}.`,
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
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('accountsPayable.title')}</h2>
            <p className="text-muted-foreground">{t('accountsPayable.description')}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accountsPayable.historyTitle')}</CardTitle>
            <CardDescription>{t('accountsPayable.historyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="mb-4 flex flex-wrap gap-4">
               <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('accountsPayable.searchPlaceholder')}
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
                    <TableHead>{t('accountsPayable.table.invoiceNo')}</TableHead>
                    <TableHead>{t('accountsPayable.table.supplier')}</TableHead>
                    <TableHead>{t('accountsPayable.table.departureDate')}</TableHead>
                    <TableHead>{t('accountsPayable.table.outstandingAmount')}</TableHead>
                    <TableHead>{t('invoices.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions.title')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => {
                    const total = getInvoiceTotal(invoice);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{getFinca(invoice.farmId)?.name || t('invoices.unknownCustomer')}</TableCell>
                        <TableCell>{format(parseISO(invoice.farmDepartureDate), 'PPP')}</TableCell>
                        <TableCell>${total.toFixed(2)}</TableCell>
                         <TableCell>
                          <Badge variant={
                              invoice.purchaseStatus === 'Paid' ? 'secondary' :
                              invoice.purchaseStatus === 'Overdue' ? 'destructive' :
                              'outline'
                          }>
                              {invoice.purchaseStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/invoices/${invoice.id}`} passHref>
                              <Button variant="ghost" size="icon" title={t('invoices.editTooltip')}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">{t('invoices.editTooltip')}</span>
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
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
