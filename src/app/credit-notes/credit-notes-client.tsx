'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { addCreditNote, deleteCreditNote } from '@/services/credit-notes';
import type { CreditNote } from '@/lib/types';
import { CreditNoteForm } from './credit-note-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { type DateRange } from 'react-day-picker';

type CreditNoteFormData = Omit<CreditNote, 'id'>;

const ITEMS_PER_PAGE = 10;

export function CreditNotesClient() {
  const { creditNotes, invoices, customers, consignatarios, refreshData } = useAppData();
  const [localCreditNotes, setLocalCreditNotes] = useState<CreditNote[]>([]);
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<CreditNote | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    let filtered = creditNotes;
    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      filtered = filtered.filter(note => 
        isWithinInterval(parseISO(note.date), range)
      );
    }
    setLocalCreditNotes(filtered);
    setCurrentPage(1);
  }, [creditNotes, dateRange]);
  
  const totalPages = Math.ceil(localCreditNotes.length / ITEMS_PER_PAGE);

  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return localCreditNotes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [localCreditNotes, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
  };

  const handleFormSubmit = async (formData: CreditNoteFormData) => {
    setIsSubmitting(true);
    
    try {
      await addCreditNote(formData);
      toast({ title: t('common.success'), description: t('creditNotes.toast.added') });
      await refreshData();
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: t('common.errorSaving'),
        description: t('creditNotes.toast.error', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
      handleCloseDialog();
    }
  };

  const handleDeleteClick = (note: CreditNote) => {
    setNoteToDelete(note);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteCreditNote(noteToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('creditNotes.toast.deleted') });
    } catch (error) {
      console.error("Error deleting note:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: t('common.errorDeleting'),
        description: t('creditNotes.toast.deleteError', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('creditNotes.title')}</h2>
            <p className="text-muted-foreground">{t('creditNotes.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('creditNotes.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('creditNotes.addTitle')}</DialogTitle>
            </DialogHeader>
            <CreditNoteForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              isSubmitting={isSubmitting}
              invoices={invoices}
              customers={customers}
              consignatarios={consignatarios}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>{t('creditNotes.list.title')}</CardTitle>
            <CardDescription>{t('creditNotes.list.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('creditNotes.list.date')}</TableHead>
                  <TableHead>{t('creditNotes.list.invoice')}</TableHead>
                  <TableHead>{t('creditNotes.list.amount')}</TableHead>
                  <TableHead>{t('creditNotes.list.reason')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{format(parseISO(note.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{note.invoiceNumber}</TableCell>
                    <TableCell>${note.amount.toFixed(2)}</TableCell>
                    <TableCell>{note.reason}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(note)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('creditNotes.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
