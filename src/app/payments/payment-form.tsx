
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Payment, Invoice, CreditNote, DebitNote, BunchItem, Customer, Finca, Consignatario } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, toDate, parseISO } from 'date-fns';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/context/i18n-context';

type InvoiceWithBalance = Invoice & { 
    balance: number; 
    total: number;
    payments: number;
    consigneeName?: string; 
};

const paymentInvoiceSchema = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  consigneeName: z.string().optional(),
  farmDepartureDate: z.string(),
  balance: z.number(),
  isSelected: z.boolean(),
  amountToPay: z.coerce.number().min(0, "El abono debe ser positivo.").optional(),
});

const formSchema = z.object({
  entityId: z.string().min(1, { message: "Por favor seleccione una entidad." }),
  paymentInvoices: z.array(paymentInvoiceSchema),
  paymentDate: z.date({ required_error: "La fecha es requerida." }),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia Internacional']),
  reference: z.string().optional(),
  bankFee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
}).refine(data => data.paymentInvoices.some(inv => inv.isSelected), {
    message: "Debe seleccionar al menos una factura.",
    path: ["paymentInvoices"],
}).refine(data => {
    const selectedInvoices = data.paymentInvoices.filter(inv => inv.isSelected);
    const totalAmount = selectedInvoices.reduce((acc, inv) => acc + (inv.amountToPay || 0), 0);
    return totalAmount > 0;
}, {
    message: "El monto total a pagar (la suma de los abonos) debe ser mayor que cero.",
    path: ["paymentInvoices"],
});


type PaymentFormData = z.infer<typeof formSchema>;
type FormSubmitData = Omit<Payment, 'id' | 'invoiceId' | 'amount'>;

type PaymentFormProps = {
  onSubmit: (
    paymentDetails: FormSubmitData,
    selectedInvoices: { invoiceId: string; balance: number; type: 'sale' | 'purchase' | 'both', farmDepartureDate: string, amountToPay: number }[],
    bankFee?: number
  ) => Promise<boolean>;
  isSubmitting: boolean;
  customers: Customer[];
  fincas: Finca[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  payments: Payment[];
  consignatarios: Consignatario[];
  paymentType: 'sale' | 'purchase';
};

export function PaymentForm({ 
    onSubmit, 
    isSubmitting, 
    customers,
    fincas,
    invoices, 
    creditNotes, 
    debitNotes, 
    payments, 
    consignatarios,
    paymentType,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const [paymentPreview, setPaymentPreview] = useState<{ invoiceNumber: string; amountToApply: number }[] | null>(null);
  const [bankFeePreview, setBankFeePreview] = useState<number | undefined>(undefined);

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      entityId: '',
      paymentInvoices: [],
      paymentDate: new Date(),
      paymentMethod: 'Transferencia',
      reference: '',
      bankFee: 0,
      notes: '',
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'paymentInvoices',
  });

  const selectedEntityId = form.watch('entityId');
  const watchedPaymentInvoices = form.watch('paymentInvoices');

  useEffect(() => {
    if (selectedEntityId && paymentType) {
        const entityInvoices = invoices.filter(inv => {
          const isCorrectType = inv.type === paymentType || inv.type === 'both';
          
          let isCorrectEntity = false;
          if (paymentType === 'purchase') {
            isCorrectEntity = inv.farmId === selectedEntityId;
          } else {
            isCorrectEntity = inv.customerId === selectedEntityId;
          }
          
          return isCorrectEntity && isCorrectType;
        });

        const calculatedInvoices = entityInvoices.map(invoice => {
            const subtotal = invoice.items.reduce((acc, item) => {
              if (!item.bunches) return acc;
              const numberOfBoxes = item.numberOfBoxes || 1;
              const priceField = paymentType === 'purchase' ? 'purchasePrice' : 'salePrice';
              
              const itemSubtotal = item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
                const productLower = (bunch.product || '').toLowerCase();
                const isGyp = productLower.includes('gyp');
                const price = bunch[priceField] || 0;
                
                if (isGyp) {
                    return bunchAcc + (bunch.bunchesPerBox * price);
                }
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0);
                return bunchAcc + (stems * price);
              }, 0);
              
              return acc + (itemSubtotal * numberOfBoxes);
            }, 0);

            const creditsForType = creditNotes.filter(cn => cn.invoiceId === invoice.id && cn.type === paymentType).reduce((sum, note) => sum + note.amount, 0);
            const debitsForType = debitNotes.filter(dn => dn.invoiceId === invoice.id && dn.type === paymentType).reduce((sum, note) => sum + note.amount, 0);
            const paidForType = payments.filter(p => p.invoiceId === invoice.id && p.type === paymentType).reduce((sum, payment) => sum + payment.amount, 0);
            
            const total = subtotal + debitsForType - creditsForType;
            const balance = total - paidForType;
            
            let consigneeName = '';
            if(paymentType === 'sale'){
              if (invoice.consignatarioId) {
                consigneeName = consignatarioMap.get(invoice.consignatarioId) || 'Desconocido';
              } else {
                consigneeName = customerMap.get(invoice.customerId) || 'Desconocido';
              }
            } else {
               const farm = fincas.find(f => f.id === invoice.farmId);
               consigneeName = farm?.name || 'Desconocido';
            }
            
            return { 
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                farmDepartureDate: invoice.farmDepartureDate,
                balance, 
                total, 
                consigneeName,
                isSelected: false,
                amountToPay: 0,
            };
        }).filter(inv => inv.balance > 0.01);
        
        const sorted = calculatedInvoices.sort((a,b) => new Date(a.farmDepartureDate).getTime() - new Date(b.farmDepartureDate).getTime())
        replace(sorted);
    } else {
        replace([]);
    }
  }, [selectedEntityId, paymentType, invoices, creditNotes, debitNotes, payments, consignatarios, customers, fincas, form, consignatarioMap, customerMap, replace]);


  const handlePreview = () => {
    form.trigger().then(isValid => {
        if (!isValid) {
            setPaymentPreview(null);
            setBankFeePreview(undefined);
            return;
        }

        const preview = watchedPaymentInvoices
            .filter(inv => inv.isSelected && (inv.amountToPay || 0) > 0)
            .map(inv => ({ invoiceNumber: inv.invoiceNumber, amountToApply: inv.amountToPay! }));
        
        setPaymentPreview(preview);
        setBankFeePreview(form.getValues('bankFee'));
    });
  };

  async function handleSubmit(values: PaymentFormData) {
    const { entityId, bankFee, ...paymentDetails } = values;
    
    const invoicesToPay = values.paymentInvoices
      .filter(inv => inv.isSelected && (inv.amountToPay || 0) > 0)
      .map(inv => {
          const originalInvoice = invoices.find(i => i.id === inv.invoiceId);
          if (!originalInvoice) throw new Error(`Invoice ${inv.invoiceId} not found`);
          return {
              invoiceId: inv.invoiceId,
              balance: inv.balance,
              amountToPay: inv.amountToPay!,
              type: originalInvoice.type,
              farmDepartureDate: originalInvoice.farmDepartureDate,
          };
      });

    const finalPaymentDetails: FormSubmitData = {
      type: paymentType,
      paymentDate: paymentDetails.paymentDate.toISOString(),
      paymentMethod: paymentDetails.paymentMethod,
      reference: paymentDetails.reference,
      notes: paymentDetails.notes,
    };

    const success = await onSubmit(finalPaymentDetails, invoicesToPay, bankFee);

    if (success) {
        form.reset({
            ...form.getValues(),
            paymentInvoices: [],
            paymentDate: new Date(),
            reference: '',
            bankFee: 0,
            notes: '',
        });
        setPaymentPreview(null);
        setBankFeePreview(undefined);
    }
  }

  const handleSelectAll = (checked: boolean) => {
    const updatedInvoices = watchedPaymentInvoices.map(inv => ({...inv, isSelected: checked}));
    replace(updatedInvoices);
    form.trigger("paymentInvoices");
  };

  const handleSingleSelect = (checked: boolean, index: number) => {
    const updatedInvoices = [...watchedPaymentInvoices];
    updatedInvoices[index].isSelected = checked;
    replace(updatedInvoices);
    form.trigger("paymentInvoices");
  };
  
  const entities = paymentType === 'purchase' ? fincas : customers;
  const entityLabel = paymentType === 'purchase' ? t('payments.form.supplierLabel') : t('payments.form.customerLabel');
  const entityPlaceholder = paymentType === 'purchase' ? t('payments.form.supplierPlaceholder') : t('payments.form.customerPlaceholder');
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="entityId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{entityLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={entityPlaceholder} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {entities.map(entity => (
                            <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
            )}
          />
          
          {fields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('payments.form.pendingInvoicesTitle')}</CardTitle>
                <CardDescription>{t('payments.form.pendingInvoicesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                    control={form.control}
                    name="paymentInvoices"
                    render={() => (
                        <FormItem>
                            <div className="max-h-96 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                        <Checkbox
                                            checked={fields.length > 0 && fields.every(f => f.isSelected)}
                                            onCheckedChange={(checked) => handleSelectAll(checked === true)}
                                        />
                                        </TableHead>
                                        <TableHead>{t('payments.form.table.invoiceNo')}</TableHead>
                                        <TableHead>{t('payments.form.table.consignee')}</TableHead>
                                        <TableHead>{t('payments.form.table.date')}</TableHead>
                                        <TableHead>{t('payments.form.table.balance')}</TableHead>
                                        <TableHead className="w-40 text-right">{t('payments.form.table.payment')}</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {fields.map((field, index) => {
                                        return (
                                            <TableRow key={field.id}>
                                            <TableCell>
                                                <Controller
                                                    control={form.control}
                                                    name={`paymentInvoices.${index}.isSelected`}
                                                    render={({ field: checkboxField }) => (
                                                        <Checkbox
                                                            checked={checkboxField.value}
                                                            onCheckedChange={(checked) => handleSingleSelect(checked === true, index)}
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>{field.invoiceNumber}</TableCell>
                                            <TableCell>{field.consigneeName}</TableCell>
                                            <TableCell>{format(parseISO(field.farmDepartureDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>${field.balance.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Controller
                                                     control={form.control}
                                                     name={`paymentInvoices.${index}.amountToPay`}
                                                     render={({ field: inputField }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            disabled={!watchedPaymentInvoices[index]?.isSelected}
                                                            {...inputField}
                                                            onBlur={() => form.trigger("paymentInvoices")}
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value);
                                                                const validatedValue = isNaN(value) ? 0 : Math.min(value, field.balance);
                                                                inputField.onChange(validatedValue);
                                                            }}
                                                            className="text-right"
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    </TableBody>
                                </Table>
                            </div>
                            <FormMessage className="mt-2" />
                        </FormItem>
                    )}
                />
              </CardContent>
            </Card>
          )}

          {watchedPaymentInvoices.some(inv => inv.isSelected) && (
             <div className="space-y-4 border p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="paymentDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>{t('payments.form.paymentDate')}</FormLabel>
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
                    <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('payments.form.paymentMethod')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={t('payments.form.paymentMethodPlaceholder')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Efectivo">{t('payments.methods.cash')}</SelectItem>
                                <SelectItem value="Transferencia">{t('payments.methods.transfer')}</SelectItem>
                                <SelectItem value="Transferencia Internacional">{t('payments.methods.internationalTransfer')}</SelectItem>
                                <SelectItem value="Cheque">{t('payments.methods.check')}</SelectItem>
                                <SelectItem value="Tarjeta de Crédito">{t('payments.methods.creditCard')}</SelectItem>
                                <SelectItem value="Tarjeta de Débito">{t('payments.methods.debitCard')}</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="bankFee"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('payments.form.bankFee')}</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('payments.form.reference')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('payments.form.referencePlaceholder')} {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('payments.form.notes')}</FormLabel>
                        <FormControl>
                        <Textarea placeholder={t('payments.form.notesPlaceholder')} {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handlePreview} disabled={isSubmitting || !watchedPaymentInvoices.some(inv => inv.isSelected)}>
                {t('payments.form.previewButton')}
              </Button>
          </div>
        </form>
      </Form>

       <AlertDialog open={!!paymentPreview} onOpenChange={() => setPaymentPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('payments.dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('payments.dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('payments.dialog.invoiceNo')}</TableHead>
                        <TableHead className="text-right">{t('payments.dialog.amountToApply')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paymentPreview?.map(p => (
                        <TableRow key={p.invoiceNumber}>
                            <TableCell>{p.invoiceNumber}</TableCell>
                            <TableCell className="text-right">${p.amountToApply.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    {(bankFeePreview ?? 0) > 0 && (
                        <TableRow>
                            <TableCell>{t('payments.dialog.bankFee')}</TableCell>
                            <TableCell className="text-right">-${(Number(bankFeePreview) || 0).toFixed(2)}</TableCell>
                        </TableRow>
                    )}
                     <TableRow className="font-bold text-lg bg-muted/50">
                        <TableCell>{t('payments.dialog.total')}</TableCell>
                        <TableCell className="text-right">
                           ${((paymentPreview?.reduce((acc, p) => acc + p.amountToApply, 0) || 0) - (Number(bankFeePreview) || 0)).toFixed(2)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentPreview(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('payments.dialog.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
