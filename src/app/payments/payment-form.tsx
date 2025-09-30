'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Payment, Invoice, CreditNote, DebitNote, BunchItem, Customer, Finca } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, toDate } from 'date-fns';
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

type InvoiceWithBalance = Invoice & { balance: number };

const formSchema = z.object({
  entityId: z.string().min(1, { message: "Por favor seleccione una entidad." }),
  selectedInvoiceIds: z.record(z.boolean()).refine(val => Object.values(val).some(v => v), {
    message: "Debe seleccionar al menos una factura.",
  }),
  amount: z.coerce.number().gt(0, { message: "El monto debe ser mayor que cero." }),
  paymentDate: z.date({ required_error: "La fecha es requerida." }),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia Internacional']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof formSchema>;
type FormSubmitData = Omit<Payment, 'id' | 'invoiceId' | 'amount'>;

type PaymentFormProps = {
  onSubmit: (paymentDetails: FormSubmitData, selectedInvoices: { invoiceId: string; balance: number; type: 'sale' | 'purchase' | 'both', flightDate: string }[], totalAmount: number) => Promise<boolean>;
  isSubmitting: boolean;
  customers: Customer[];
  fincas: Finca[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  payments: Payment[];
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
    paymentType,
}: PaymentFormProps) {
  const [invoicesWithBalance, setInvoicesWithBalance] = useState<InvoiceWithBalance[]>([]);
  const [paymentPreview, setPaymentPreview] = useState<{ invoiceNumber: string; amountToApply: number }[] | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      entityId: '',
      selectedInvoiceIds: {},
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: 'Transferencia',
      reference: '',
      notes: '',
    },
  });

  const selectedEntityId = form.watch('entityId');
  const selectedInvoiceIds = form.watch('selectedInvoiceIds');

  useEffect(() => {
    if (selectedEntityId && paymentType) {
        const entityInvoices = invoices.filter(inv => {
          const isCorrectType = inv.type === paymentType || inv.type === 'both';
          const isNotPaid = inv.status !== 'Paid';
          
          let isCorrectEntity = false;
          if (paymentType === 'purchase') {
            isCorrectEntity = inv.farmId === selectedEntityId;
          } else {
            isCorrectEntity = inv.customerId === selectedEntityId;
          }
          
          return isCorrectEntity && isCorrectType && isNotPaid;
        });

        const calculatedInvoices = entityInvoices.map(invoice => {
            const subtotal = invoice.items.reduce((acc, item) => {
              if (!item.bunches) return acc;
              const priceField = paymentType === 'purchase' ? 'purchasePrice' : 'salePrice';
              return acc + item.bunches.reduce((bunchAcc, bunch: BunchItem) => {
                const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
                return bunchAcc + (stems * bunch[priceField]);
              }, 0);
            }, 0);

            const credits = creditNotes.filter(cn => cn.invoiceId === invoice.id).reduce((sum, note) => sum + note.amount, 0);
            const debits = debitNotes.filter(dn => dn.invoiceId === invoice.id).reduce((sum, note) => sum + note.amount, 0);
            const paid = payments.filter(p => p.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amount, 0);
            
            const balance = subtotal + debits - credits - paid;
            return { ...invoice, balance };
        }).filter(inv => inv.balance > 0.01);
        
        setInvoicesWithBalance(calculatedInvoices.sort((a,b) => new Date(a.flightDate).getTime() - new Date(b.flightDate).getTime()));
        form.setValue('selectedInvoiceIds', {});
    } else {
        setInvoicesWithBalance([]);
        form.setValue('selectedInvoiceIds', {});
    }
  }, [selectedEntityId, paymentType, invoices, creditNotes, debitNotes, payments, form]);


  const totalSelectedBalance = useMemo(() => {
      return invoicesWithBalance.reduce((total, inv) => {
          if (selectedInvoiceIds[inv.id]) {
              return total + inv.balance;
          }
          return total;
      }, 0);
  }, [selectedInvoiceIds, invoicesWithBalance]);

  const handlePreview = () => {
    form.trigger().then(isValid => {
        if (!isValid) {
            setPaymentPreview(null);
            return;
        }

        const amountToApply = form.getValues('amount');
        const selectedInvoices = invoicesWithBalance.filter(inv => selectedInvoiceIds[inv.id]);
        let remainingAmount = amountToApply;
        const preview = [];

        for (const invoice of selectedInvoices) {
        if (remainingAmount <= 0) break;
        const appliedAmount = Math.min(remainingAmount, invoice.balance);
        preview.push({ invoiceNumber: invoice.invoiceNumber, amountToApply: appliedAmount });
        remainingAmount -= appliedAmount;
        }
        setPaymentPreview(preview);
    });
  };


  async function handleSubmit(values: PaymentFormData) {
    const { entityId, selectedInvoiceIds, amount, ...paymentDetails } = values;
    
    const invoicesToPay = invoicesWithBalance
      .filter(inv => selectedInvoiceIds[inv.id])
      .map(inv => ({ invoiceId: inv.id, balance: inv.balance, type: inv.type, flightDate: inv.flightDate }));

    const finalPaymentDetails: FormSubmitData = {
      ...paymentDetails,
      paymentDate: paymentDetails.paymentDate.toISOString(),
    };

    const success = await onSubmit(finalPaymentDetails, invoicesToPay, amount);

    if (success) {
        form.reset({
            entityId: values.entityId,
            selectedInvoiceIds: {},
            amount: 0,
            paymentDate: new Date(),
            paymentMethod: 'Transferencia',
            reference: '',
            notes: '',
        });
        setPaymentPreview(null);
    }
  }

  const entities = paymentType === 'purchase' ? fincas : customers;
  const entityLabel = paymentType === 'purchase' ? 'Proveedor (Finca)' : 'Cliente';
  const entityPlaceholder = paymentType === 'purchase' ? 'Seleccione un proveedor' : 'Seleccione un cliente';
  
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          
          {invoicesWithBalance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Facturas Pendientes</CardTitle>
                <CardDescription>Seleccione las facturas que desea pagar. El pago se aplicará a las facturas más antiguas primero.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                    control={form.control}
                    name="selectedInvoiceIds"
                    render={({ field }) => (
                        <FormItem>
                            <div className="max-h-64 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                        <Checkbox
                                            checked={Object.keys(selectedInvoiceIds).length > 0 && Object.keys(selectedInvoiceIds).length === invoicesWithBalance.length}
                                            onCheckedChange={(checked) => {
                                                const newSelected: Record<string, boolean> = {};
                                                if (checked) {
                                                    invoicesWithBalance.forEach(inv => newSelected[inv.id] = true);
                                                }
                                                form.setValue('selectedInvoiceIds', newSelected);
                                            }}
                                        />
                                        </TableHead>
                                        <TableHead>N° Factura</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {invoicesWithBalance.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={!!selectedInvoiceIds[invoice.id]}
                                                onCheckedChange={(checked) => {
                                                    const newSelected = {...selectedInvoiceIds};
                                                    if (checked) {
                                                        newSelected[invoice.id] = true;
                                                    } else {
                                                        delete newSelected[invoice.id];
                                                    }
                                                    form.setValue('selectedInvoiceIds', newSelected);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{format(new Date(invoice.flightDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-right">${invoice.balance.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <FormMessage className="mt-2" />
                        </FormItem>
                    )}
                />

                <div className="mt-4 text-right font-semibold">
                  Saldo Total Seleccionado: ${totalSelectedBalance.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(selectedInvoiceIds).some(key => selectedInvoiceIds[key]) && (
             <div className="space-y-4 border p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monto Total a Pagar</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField control={form.control} name="paymentDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Pago</FormLabel>
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccione un método" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Transferencia">Transferencia</SelectItem>
                                <SelectItem value="Transferencia Internacional">Transferencia Internacional</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                                <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                                <SelectItem value="Tarjeta de Débito">Tarjeta de Débito</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Referencia / Banco</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Banco Pichincha" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notas Adicionales</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Ej: Pago masivo de facturas de Septiembre" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handlePreview} disabled={isSubmitting || Object.keys(selectedInvoiceIds).length === 0}>
                Previsualizar Pago
              </Button>
          </div>
        </form>
      </Form>

       <AlertDialog open={!!paymentPreview} onOpenChange={() => setPaymentPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Distribución de Pago</AlertDialogTitle>
            <AlertDialogDescription>
                El monto total de ${Number(form.getValues('amount')).toFixed(2)} se aplicará a las facturas seleccionadas de la siguiente manera. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>N° Factura</TableHead>
                        <TableHead className="text-right">Monto a Aplicar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paymentPreview?.map(p => (
                        <TableRow key={p.invoiceNumber}>
                            <TableCell>{p.invoiceNumber}</TableCell>
                            <TableCell className="text-right">${p.amountToApply.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentPreview(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
