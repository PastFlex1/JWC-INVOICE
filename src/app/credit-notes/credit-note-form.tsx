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
import type { CreditNote, Invoice, Consignatario, Customer, BunchItem } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, toDate, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Please select a customer." }),
  invoiceId: z.string().min(1, { message: "Please select an invoice." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }),
  date: z.date({ required_error: "Date is required." }),
});

type CreditNoteFormData = Omit<CreditNote, 'id' | 'invoiceNumber' | 'date'> & { customerId: string, date: Date };
type FormSubmitData = Omit<CreditNote, 'id'>;

type InvoiceWithTotal = Invoice & { total: number };

type CreditNoteFormProps = {
  onSubmit: (data: FormSubmitData) => void;
  onClose: () => void;
  isSubmitting: boolean;
  invoices: Invoice[];
  customers: Customer[];
  consignatarios: Consignatario[];
};

export function CreditNoteForm({ onSubmit, onClose, isSubmitting, invoices, customers, consignatarios }: CreditNoteFormProps) {
  const [consigneeName, setConsigneeName] = useState<string>('');
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithTotal[]>([]);
  const { t } = useTranslation();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      customerId: '',
      invoiceId: '',
      amount: 0,
      reason: '',
      date: new Date(),
    },
  });

  const selectedCustomerId = form.watch('customerId');
  const selectedInvoiceId = form.watch('invoiceId');

  useEffect(() => {
    if (selectedCustomerId) {
      const customerInvoices = invoices
        .filter(inv => inv.customerId === selectedCustomerId && (inv.type === 'sale' || inv.type === 'both'))
        .map(inv => {
          const total = inv.items.reduce((acc, item) => {
            if (!item.bunches) return acc;
            return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
              const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
              return bunchAcc + (stems * bunch.salePrice);
            }, 0);
          }, 0);
          return { ...inv, total };
        })
        .sort((a, b) => new Date(a.farmDepartureDate).getTime() - new Date(b.farmDepartureDate).getTime());
      setFilteredInvoices(customerInvoices);
      form.setValue('invoiceId', '');
    } else {
      setFilteredInvoices([]);
    }
  }, [selectedCustomerId, invoices, form]);


  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find(inv => inv.id === selectedInvoiceId);
      if (invoice) {
        if (invoice.consignatarioId) {
          const consignee = consignatarios.find(c => c.id === invoice.consignatarioId);
          setConsigneeName(consignee?.nombreConsignatario || 'Consignatario no encontrado');
        } else {
          const customer = customers.find(c => c.id === invoice.customerId);
          setConsigneeName(customer?.name || 'Cliente no encontrado');
        }
      }
    } else {
      setConsigneeName('');
    }
  }, [selectedInvoiceId, invoices, customers, consignatarios]);


  function handleSubmit(values: z.infer<typeof formSchema>) {
    const selectedInvoice = invoices.find(inv => inv.id === values.invoiceId);
    if (!selectedInvoice) return;

    const dataToSubmit: FormSubmitData = {
        invoiceId: values.invoiceId,
        amount: values.amount,
        reason: values.reason,
        invoiceNumber: selectedInvoice.invoiceNumber,
        date: values.date.toISOString(),
        type: 'sale',
    };
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('creditNotes.form.customer')}</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('creditNotes.form.customerPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
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
          name="invoiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('creditNotes.form.invoice')}</FormLabel>
               <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCustomerId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCustomerId ? t('creditNotes.form.invoicePlaceholder') : t('invoices.new.selectCustomerFirst')} />
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

        {consigneeName && (
          <FormItem>
            <FormLabel>{t('creditNotes.form.consignee')}</FormLabel>
            <FormControl>
              <Input readOnly disabled value={consigneeName} />
            </FormControl>
          </FormItem>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('creditNotes.form.amount')}</FormLabel>
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
              <FormLabel>{t('creditNotes.form.reason')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('creditNotes.form.reasonPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('creditNotes.form.date')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(toDate(field.value), "PPP") : <span>{t('invoices.new.selectDate')}</span>}
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
                {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t('common.saving') : t('creditNotes.add')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
