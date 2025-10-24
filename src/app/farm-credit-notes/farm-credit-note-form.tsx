'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import type { CreditNote, Invoice, Finca, BunchItem } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, toDate, parseISO } from 'date-fns';

const formSchema = z.object({
  invoiceId: z.string().min(1, { message: "Please select an invoice." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }),
  date: z.date({ required_error: "Date is required." }),
});

type CreditNoteFormData = Omit<CreditNote, 'id' | 'invoiceNumber' | 'date'> & { date: Date };
type FormSubmitData = Omit<CreditNote, 'id'>;

type InvoiceWithTotal = Invoice & { total: number };

type FarmCreditNoteFormProps = {
  onSubmit: (data: FormSubmitData) => void;
  onClose: () => void;
  isSubmitting: boolean;
  invoices: Invoice[];
  fincas: Finca[];
};

export function FarmCreditNoteForm({ onSubmit, onClose, isSubmitting, invoices, fincas }: FarmCreditNoteFormProps) {
  const [selectedFincaId, setSelectedFincaId] = useState<string>('');
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithTotal[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      invoiceId: '',
      amount: 0,
      reason: '',
      date: new Date(),
    },
  });

  useEffect(() => {
    if (selectedFincaId) {
      const fincaInvoices = invoices
        .filter(inv => inv.farmId === selectedFincaId && (inv.type === 'purchase' || inv.type === 'both'))
        .map(inv => {
          const total = inv.items.reduce((acc, item) => {
            if (!item.bunches) return acc;
            return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
              const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
              return bunchAcc + (stems * bunch.purchasePrice);
            }, 0);
          }, 0);
          return { ...inv, total };
        })
        .sort((a, b) => new Date(b.farmDepartureDate).getTime() - new Date(a.farmDepartureDate).getTime());
      setFilteredInvoices(fincaInvoices);
      form.setValue('invoiceId', '');
    } else {
      setFilteredInvoices([]);
    }
  }, [selectedFincaId, invoices, form]);


  function handleSubmit(values: z.infer<typeof formSchema>) {
    const selectedInvoice = invoices.find(inv => inv.id === values.invoiceId);
    if (!selectedInvoice) return;

    const dataToSubmit: FormSubmitData = {
        ...values,
        invoiceNumber: selectedInvoice.invoiceNumber,
        date: values.date.toISOString(),
        type: 'purchase',
    };
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormItem>
          <FormLabel>Finca/Proveedor</FormLabel>
          <Select onValueChange={setSelectedFincaId}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una finca" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {fincas.map(finca => (
                  <SelectItem key={finca.id} value={finca.id}>
                    {finca.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </FormItem>

        <FormField
          control={form.control}
          name="invoiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Factura a Acreditar</FormLabel>
               <Select onValueChange={field.onChange} value={field.value} disabled={!selectedFincaId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una factura" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredInvoices.map(invoice => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} ({format(parseISO(invoice.farmDepartureDate), 'dd/MM/yy')}) - ${invoice.total.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto a Acreditar</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="50.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Calidad de la flor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Nota de Crédito</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(toDate(field.value), "PPP") : <span>Seleccionar fecha</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
        )}/>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Guardando...' : 'Añadir Nota de Crédito'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
