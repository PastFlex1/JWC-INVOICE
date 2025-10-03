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
import type { Payment, Invoice, CreditNote, DebitNote, BunchItem, Customer, Finca, Consignatario } from '@/lib/types';
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

type InvoiceWithBalance = Invoice & { balance: number; total: number; payments: number; consigneeName?: string; };

const paymentPerInvoiceSchema = z.object({
  paymentAmount: z.coerce.number().optional()
});

const formSchema = z.object({
  entityId: z.string().min(1, { message: "Por favor seleccione una entidad." }),
  paymentDate: z.date({ required_error: "La fecha es requerida." }),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia Internacional']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  invoices: z.record(paymentPerInvoiceSchema).refine(
    (invoices) => Object.values(invoices).some(inv => inv.paymentAmount && inv.paymentAmount > 0),
    { message: "Debe ingresar un monto de pago para al menos una factura." }
  )
});

type PaymentFormData = z.infer<typeof formSchema>;
type FormSubmitData = Omit<Payment, 'id' | 'invoiceId' | 'amount'>;

type PaymentFormProps = {
  onSubmit: (paymentDetails: FormSubmitData, selectedInvoices: { invoiceId: string; balance: number; amountToPay: number; type: 'sale' | 'purchase' | 'both', flightDate: string }[], totalAmount: number) => Promise<boolean>;
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
  const [invoicesWithBalance, setInvoicesWithBalance] = useState<InvoiceWithBalance[]>([]);
  const [paymentPreview, setPaymentPreview] = useState<{ invoiceNumber: string; amountToApply: number }[] | null>(null);

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      entityId: '',
      invoices: {},
      paymentDate: new Date(),
      paymentMethod: 'Transferencia',
      reference: '',
      notes: '',
    },
  });

  const selectedEntityId = form.watch('entityId');
  const watchedInvoices = form.watch('invoices');

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
            
            const total = subtotal + debits - credits;
            const balance = total - paid;
            
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
            
            return { ...invoice, balance, total, payments: paid, consigneeName };
        }).filter(inv => inv.balance > 0.01);
        
        setInvoicesWithBalance(calculatedInvoices.sort((a,b) => new Date(a.flightDate).getTime() - new Date(b.flightDate).getTime()));
        form.setValue('invoices', {});
    } else {
        setInvoicesWithBalance([]);
        form.setValue('invoices', {});
    }
  }, [selectedEntityId, paymentType, invoices, creditNotes, debitNotes, payments, consignatarios, customers, fincas, form, consignatarioMap, customerMap]);


  const totalSelectedBalance = useMemo(() => {
    return invoicesWithBalance.reduce((total, inv) => {
        if (watchedInvoices[inv.id]?.paymentAmount) {
            return total + inv.balance;
        }
        return total;
    }, 0);
  }, [watchedInvoices, invoicesWithBalance]);
  
  const totalAmountToPay = useMemo(() => {
    return Object.values(watchedInvoices).reduce((total, inv) => {
      return total + (inv.paymentAmount || 0);
    }, 0);
  }, [watchedInvoices]);


  const handlePreview = () => {
    form.trigger().then(isValid => {
        if (!isValid) {
            setPaymentPreview(null);
            return;
        }
        
        const preview = Object.entries(watchedInvoices)
            .filter(([, inv]) => inv.paymentAmount && inv.paymentAmount > 0)
            .map(([invoiceId, inv]) => {
                const invoice = invoicesWithBalance.find(i => i.id === invoiceId);
                return {
                    invoiceNumber: invoice?.invoiceNumber || 'N/A',
                    amountToApply: inv.paymentAmount!
                };
            });
        
        setPaymentPreview(preview);
    });
  };


  async function handleSubmit(values: PaymentFormData) {
    const { entityId, invoices: paymentsToApply, ...paymentDetails } = values;

    const invoicesToPay = Object.entries(paymentsToApply)
      .filter(([,p]) => p.paymentAmount && p.paymentAmount > 0)
      .map(([invoiceId, p]) => {
        const invoice = invoicesWithBalance.find(inv => inv.id === invoiceId);
        return {
          invoiceId: invoiceId,
          balance: invoice?.balance || 0,
          amountToPay: p.paymentAmount!,
          type: invoice?.type || 'sale',
          flightDate: invoice?.flightDate || new Date().toISOString()
        };
      });

    const totalToPay = invoicesToPay.reduce((sum, inv) => sum + inv.amountToPay, 0);
    
    const finalPaymentDetails: FormSubmitData = {
      ...paymentDetails,
      paymentDate: paymentDetails.paymentDate.toISOString(),
    };

    const success = await onSubmit(finalPaymentDetails, invoicesToPay, totalToPay);

    if (success) {
        form.reset({
            entityId: values.entityId,
            invoices: {},
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
                <CardDescription>Seleccione las facturas e ingrese el monto a pagar para cada una.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                    control={form.control}
                    name="invoices"
                    render={() => (
                        <FormItem>
                            <div className="max-h-96 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>N° Factura</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Consignatario</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Pagos</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="w-40 text-right">Abono</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {invoicesWithBalance.map((invoice, index) => {
                                      const fieldName = `invoices.${invoice.id}.paymentAmount`;
                                      const isChecked = !!watchedInvoices[invoice.id];
                                      return (
                                        <TableRow key={invoice.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        const currentInvoices = form.getValues('invoices');
                                                        if (checked) {
                                                            currentInvoices[invoice.id] = { paymentAmount: undefined };
                                                        } else {
                                                            delete currentInvoices[invoice.id];
                                                        }
                                                        form.setValue('invoices', currentInvoices, { shouldValidate: true });
                                                        form.trigger('invoices');
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{invoice.invoiceNumber}</TableCell>
                                            <TableCell>{format(new Date(invoice.flightDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{invoice.consigneeName}</TableCell>
                                            <TableCell className="text-right">${invoice.total.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${invoice.payments.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${invoice.balance.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                              <FormField
                                                  control={form.control}
                                                  name={fieldName as any}
                                                  render={({ field }) => (
                                                      <Input
                                                          type="number"
                                                          step="0.01"
                                                          placeholder="0.00"
                                                          disabled={!isChecked}
                                                          {...field}
                                                          value={field.value ?? ''}
                                                          onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)}
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
                <div className="mt-4 flex justify-end items-center gap-4 font-semibold">
                    <span>Monto Total a Pagar:</span>
                    <span>${totalAmountToPay.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {Object.values(watchedInvoices).some(inv => inv?.paymentAmount && inv.paymentAmount > 0) && (
             <div className="space-y-4 border p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Button type="button" variant="outline" onClick={handlePreview} disabled={isSubmitting || totalAmountToPay <= 0}>
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
                El monto total de ${totalAmountToPay.toFixed(2)} se aplicará a las facturas seleccionadas de la siguiente manera. ¿Desea continuar?
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
