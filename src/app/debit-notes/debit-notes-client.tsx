'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, X as XIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { addDebitNote, deleteDebitNote } from '@/services/debit-notes';
import type { DebitNote } from '@/lib/types';
import { DebitNoteForm } from './debit-note-form';
import { DebitNotesView } from './debit-notes-view';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { type DateRange } from 'react-day-picker';
import DebitNotesDownloadPdfButton from './debit-notes-download-pdf';
import DebitNotesDownloadExcelButton from './debit-notes-download-excel';
import SendReportDialog from '@/app/shared/send-report-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type DebitNoteFormData = Omit<DebitNote, 'id'>;
type DebitNoteWithDetails = DebitNote & { consigneeName?: string };

export function DebitNotesClient() {
  const { debitNotes, invoices, customers, consignatarios, refreshData } = useAppData();
  const [localDebitNotes, setLocalDebitNotes] = useState<DebitNoteWithDetails[]>([]);
  const { t } = useTranslation();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<DebitNote | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);
  const invoiceMap = useMemo(() => new Map(invoices.map(i => [i.id, i])), [invoices]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setLocalDebitNotes([]);
      return;
    }

    const customerInvoiceIds = new Set(invoices.filter(inv => inv.customerId === selectedCustomerId).map(inv => inv.id));
    
    let filtered = debitNotes.filter(note => customerInvoiceIds.has(note.invoiceId)).map(note => {
        const invoice = invoiceMap.get(note.invoiceId);
        let consigneeName = 'Desconocido';
        if (invoice) {
          if (invoice.consignatarioId) {
            consigneeName = consignatarioMap.get(invoice.consignatarioId) || 'Consignatario no encontrado';
          } else {
            consigneeName = customerMap.get(invoice.customerId) || 'Cliente no encontrado';
          }
        }
        return { ...note, consigneeName };
    });

    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      filtered = filtered.filter(note => 
        isWithinInterval(parseISO(note.date), range)
      );
    }
    setLocalDebitNotes(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [debitNotes, dateRange, customerMap, invoiceMap, consignatarioMap, selectedCustomerId, invoices]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
  };

  const handleFormSubmit = async (formData: DebitNoteFormData) => {
    setIsSubmitting(true);
    
    try {
      await addDebitNote(formData);
      toast({ title: t('common.success'), description: t('debitNotes.toast.added') });
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: t('common.errorSaving'),
        description: t('debitNotes.toast.error', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (note: DebitNote) => {
    setNoteToDelete(note);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteDebitNote(noteToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('debitNotes.toast.deleted') });
    } catch (error) {
      console.error("Error deleting note:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: t('common.errorDeleting'),
        description: t('debitNotes.toast.deleteError', { error: errorMessage }),
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
            <h2 className="text-3xl font-bold tracking-tight font-headline">Notas de Débito (Cliente)</h2>
            <p className="text-muted-foreground">{t('debitNotes.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('debitNotes.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('debitNotes.addTitle')}</DialogTitle>
            </DialogHeader>
            <DebitNoteForm 
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
            <CardTitle>{t('debitNotes.list.title')}</CardTitle>
            <CardDescription>{t('debitNotes.list.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-4">
               <Select onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                  <SelectValue placeholder="Seleccione un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
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
                    disabled={!selectedCustomerId}
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
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button variant="ghost" onClick={() => setDateRange(undefined)}>
                    <XIcon className="h-4 w-4" />
                </Button>
              )}
               <div className="flex-grow" />
                {localDebitNotes.length > 0 && (
                <div className="flex gap-2">
                    <DebitNotesDownloadPdfButton notes={localDebitNotes} />
                    <DebitNotesDownloadExcelButton notes={localDebitNotes} />
                    <Button variant="outline" onClick={() => setIsSendDialogOpen(true)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar por Correo
                    </Button>
                </div>
                )}
            </div>
            <DebitNotesView 
              notes={localDebitNotes} 
              onDelete={handleDeleteClick}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('debitNotes.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <SendReportDialog
        isOpen={isSendDialogOpen}
        onClose={() => setIsSendDialogOpen(false)}
        reportTitle="Reporte de Notas de Débito"
        reportDescription="El reporte adjunto contiene un resumen de las notas de débito para el período seleccionado."
        attachmentFileName="Reporte-Notas-de-Debito.pdf"
        elementIdToPrint="debit-notes-to-print"
      />
    </>
  );
}
