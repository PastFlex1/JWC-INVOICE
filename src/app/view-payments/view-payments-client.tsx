'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, X as XIcon, Eye, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Payment, Invoice, Customer, Finca } from '@/lib/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { PaymentReceiptView } from './payment-receipt-view';
import { SendPaymentReceiptDialog } from './send-payment-receipt-dialog';


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

const ITEMS_PER_PAGE = 15;

export type PaymentDetail = {
    invoiceNumber: string;
    amount: number;
    customerName: string;
    consigneeName: string;
};

export type AggregatedPayment = {
    id: string;
    paymentDate: string;
    entityName: string;
    entityEmail: string | undefined;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    reference?: string;
    notes?: string;
    details: PaymentDetail[];
};

export function ViewPaymentsClient() {
  const { payments, invoices, customers, fincas, consignatarios } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<AggregatedPayment | null>(null);
  const [paymentToSend, setPaymentToSend] = useState<AggregatedPayment | null>(null);

  const { t } = useTranslation();

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f])), [fincas]);
  const consignatarioMap = useMemo(() => new Map(consignatarios.map(c => [c.id, c.nombreConsignatario])), [consignatarios]);
  const invoiceMap = useMemo(() => new Map(invoices.map(i => [i.id, i])), [invoices]);

  const aggregatedPayments = useMemo(() => {
      const groupedPayments: Record<string, AggregatedPayment> = {};

      payments.forEach(p => {
          const invoice = invoiceMap.get(p.invoiceId);
          if (!invoice) return;

          let entityId: string | null = null;
          let entity: Customer | Finca | undefined;
          
          if (p.type === 'purchase') {
              entityId = invoice.farmId;
              entity = fincaMap.get(entityId);
          } else { // 'sale' or 'both' for a customer payment
              entityId = invoice.customerId;
              entity = customerMap.get(entityId);
          }

          if (!entityId || !entity) return;

          const paymentDateStr = format(parseISO(p.paymentDate), 'yyyy-MM-dd');
          const groupKey = `${paymentDateStr}-${entityId}-${p.paymentMethod}-${p.reference || ''}`;

          if (!groupedPayments[groupKey]) {
              groupedPayments[groupKey] = {
                  id: groupKey,
                  paymentDate: p.paymentDate,
                  entityName: entity.name,
                  entityEmail: 'email' in entity ? entity.email : undefined,
                  amount: 0,
                  paymentMethod: p.paymentMethod,
                  reference: p.reference,
                  notes: p.notes,
                  details: [],
              };
          }

          const customerName = customerMap.get(invoice.customerId)?.name || 'Cliente Desconocido';
          const consigneeName = invoice.consignatarioId ? (consignatarioMap.get(invoice.consignatarioId) || 'Consignatario Desconocido') : customerName;

          groupedPayments[groupKey].amount += p.amount;
          groupedPayments[groupKey].details.push({ 
            invoiceNumber: invoice.invoiceNumber, 
            amount: p.amount,
            customerName: customerName,
            consigneeName: consigneeName
          });
      });

      return Object.values(groupedPayments).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
  }, [payments, invoices, customerMap, fincaMap, invoiceMap, consignatarioMap]);

  const filteredPayments = useMemo(() => {
    let filtered = aggregatedPayments;

    if (dateRange?.from) {
      const range = {
        start: startOfDay(dateRange.from),
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from),
      };
      filtered = filtered.filter(p => isWithinInterval(parseISO(p.paymentDate), range));
    }
    
    return filtered.filter(payment => {
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        if (!lowerCaseSearch) return true;
        const invoiceNumbers = payment.details.map(d => d.invoiceNumber);
        const searchFields = [
            payment.entityName, 
            payment.paymentMethod, 
            payment.reference || '',
            ...invoiceNumbers
        ];
        return searchFields.some(field => field.toLowerCase().includes(lowerCaseSearch));
    });
  }, [aggregatedPayments, debouncedSearchTerm, dateRange]);


  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <>
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight font-headline">Historial de Pagos</h2>
                <p className="text-muted-foreground">Consulte todos los pagos registrados en el sistema.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pagos Registrados</CardTitle>
                    <CardDescription>Una lista de todos los pagos de clientes y a proveedores, agrupados por día y entidad.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-wrap gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Buscar por N° factura, cliente, método..."
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
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente/Proveedor</TableHead>
                            <TableHead>Monto Total</TableHead>
                            <TableHead>Facturas Pagadas</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paginatedPayments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>{format(parseISO(payment.paymentDate), 'PPP')}</TableCell>
                                <TableCell className="font-medium">{payment.entityName}</TableCell>
                                <TableCell className="font-bold">${payment.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        Pago a {payment.details.length} factura(s)
                                    </Badge>
                                </TableCell>
                                <TableCell>{payment.paymentMethod}</TableCell>
                                <TableCell>{payment.reference}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" title="Ver Detalle" onClick={() => setSelectedPayment(payment)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                     <Button variant="ghost" size="icon" title="Enviar por Correo" onClick={() => setPaymentToSend(payment)}>
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
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

        <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <AlertDialogContent className="sm:max-w-4xl">
                 <AlertDialogHeader>
                    <AlertDialogTitle>Detalle del Recibo de Pago</AlertDialogTitle>
                    <AlertDialogDescription>
                        Este es un resumen del pago realizado por {selectedPayment?.entityName}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 {selectedPayment && (
                   <PaymentReceiptView payment={selectedPayment} />
                 )}
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedPayment(null)}>Cerrar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {paymentToSend && (
            <SendPaymentReceiptDialog
                isOpen={!!paymentToSend}
                onClose={() => setPaymentToSend(null)}
                payment={paymentToSend}
            />
        )}
    </>
  );
}
