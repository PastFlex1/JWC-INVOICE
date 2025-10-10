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
import { FarmDebitNoteForm } from './farm-debit-note-form';
import { FarmDebitNotesView } from './farm-debit-notes-view';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { type DateRange } from 'react-day-picker';
import SendReportDialog from '@/app/shared/send-report-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DebitNoteFormData = Omit<DebitNote, 'id'>;
type DebitNoteWithDetails = DebitNote & { farmName?: string };

export function FarmDebitNotesClient() {
  const { debitNotes, invoices, fincas, refreshData } = useAppData();
  const [localDebitNotes, setLocalDebitNotes] = useState<DebitNoteWithDetails[]>([]);
  const { t } = useTranslation();
  
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<DebitNote | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f.name])), [fincas]);
  const invoiceMap = useMemo(() => new Map(invoices.map(i => [i.id, i])), [invoices]);

  useEffect(() => {
    let notesToDisplay = debitNotes.filter(note => {
        const invoice = invoiceMap.get(note.invoiceId);
        return invoice && (invoice.type === 'purchase' || invoice.type === 'both');
    });

    if (selectedFincaId) {
        notesToDisplay = notesToDisplay.filter(note => {
            const invoice = invoiceMap.get(note.invoiceId);
            return invoice?.farmId === selectedFincaId;
        });
    }
    
    let processedNotes = notesToDisplay.map(note => {
        const invoice = invoiceMap.get(note.invoiceId);
        let farmName = 'Desconocido';
        if (invoice) {
          farmName = fincaMap.get(invoice.farmId) || 'Finca no encontrada';
        }
        return { ...note, farmName };
    });

    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      processedNotes = processedNotes.filter(note => 
        isWithinInterval(parseISO(note.date), range)
      );
    }
    setLocalDebitNotes(processedNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [debitNotes, dateRange, fincaMap, invoiceMap, selectedFincaId, invoices]);

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
      toast({ title: t('common.success'), description: 'Nota de débito añadida correctamente.' });
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: t('common.errorSaving'),
        description: `No se pudo guardar la nota de débito: ${errorMessage}.`,
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
      toast({ title: t('common.success'), description: 'Nota de débito eliminada correctamente.' });
    } catch (error) {
      console.error("Error deleting note:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: t('common.errorDeleting'),
        description: `No se pudo eliminar la nota de débito: ${errorMessage}.`,
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
            <h2 className="text-3xl font-bold tracking-tight font-headline">Notas de Débito (Finca)</h2>
            <p className="text-muted-foreground">Gestiona notas de débito para tus facturas de compra.</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Nota de Débito
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir Nueva Nota de Débito (Finca)</DialogTitle>
            </DialogHeader>
            <FarmDebitNoteForm
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              isSubmitting={isSubmitting}
              invoices={invoices}
              fincas={fincas}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Notas de Débito</CardTitle>
            <CardDescription>Una lista de todas tus notas de débito de fincas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-4">
               <Select onValueChange={(value) => setSelectedFincaId(value === 'all' ? null : value)}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[300px]">
                  <SelectValue placeholder="Filtrar por finca..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Fincas</SelectItem>
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
            </div>
            <FarmDebitNotesView 
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
    </>
  );
}
