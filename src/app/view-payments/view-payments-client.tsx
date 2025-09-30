'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Payment, Invoice, Customer, Finca } from '@/lib/types';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
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

const ITEMS_PER_PAGE = 15;

type AugmentedPayment = Payment & {
    invoiceNumber: string;
    entityName: string;
};

export function ViewPaymentsClient() {
  const { payments, invoices, customers, fincas } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f.name])), [fincas]);
  const invoiceMap = useMemo(() => new Map(invoices.map(i => [i.id, i])), [invoices]);

  const augmentedPayments = useMemo(() => {
      return payments.map(p => {
          const invoice = invoiceMap.get(p.invoiceId);
          let entityName = "Desconocido";
          if(invoice){
            if(invoice.type === 'purchase' || invoice.type === 'both'){
                entityName = fincaMap.get(invoice.farmId) || "Finca desconocida";
            } else { // 'sale'
                entityName = customerMap.get(invoice.customerId) || "Cliente desconocido";
            }
          }

          return {
              ...p,
              invoiceNumber: invoice?.invoiceNumber || "N/A",
              entityName: entityName,
          };
      });
  }, [payments, invoices, customers, fincas, invoiceMap, customerMap, fincaMap]);

  const filteredPayments = useMemo(() => {
    let filtered = augmentedPayments;

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
        const searchFields = [payment.invoiceNumber, payment.entityName, payment.paymentMethod, payment.reference || ''];
        return searchFields.some(field => field.toLowerCase().includes(lowerCaseSearch));
    });
  }, [augmentedPayments, debouncedSearchTerm, dateRange]);


  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="space-y-6">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Historial de Pagos</h2>
            <p className="text-muted-foreground">Consulte todos los pagos registrados en el sistema.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Pagos Registrados</CardTitle>
                <CardDescription>Una lista de todos los pagos de clientes y a proveedores.</CardDescription>
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
                        <TableHead>Factura #</TableHead>
                        <TableHead>Cliente/Proveedor</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{format(parseISO(payment.paymentDate), 'PPP')}</TableCell>
                            <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                            <TableCell>{payment.entityName}</TableCell>
                            <TableCell>${payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{payment.reference}</TableCell>
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
  );
}
