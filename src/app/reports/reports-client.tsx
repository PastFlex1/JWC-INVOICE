'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, Text } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Invoice, CreditNote, DebitNote, BunchItem, Producto } from '@/lib/types';
import { format, parseISO, getYear } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';

type MonthlyData = {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
};

type ColorSalesData = {
  nombreColor: string;
  totalSales: number;
  colorHex: string;
};

type InvoiceDetailReport = {
  id: string;
  date: string;
  invoiceNumber: string;
  farmName: string;
  customerName: string;
  totalStems: number;
  chargeFarm: number;
  chargeClient: number;
  profit: number;
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <Text x={0} y={0} dy={0} textAnchor="end" fill="#666" width={150} style={{ whiteSpace: 'normal' }}>
        {payload.value}
      </Text>
    </g>
  );
};

export function ReportsClient() {
  const { invoices, creditNotes, debitNotes, fincas, customers, productos } = useAppData();
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const [selectedFincaId, setSelectedFincaId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const availableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.farmDepartureDate))));
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);
  
  const availableMonths = useMemo(() => {
    if (selectedYear === 'all') return [];
    const months = new Set(
      invoices
        .filter(inv => getYear(parseISO(inv.farmDepartureDate)) === parseInt(selectedYear))
        .map(inv => format(parseISO(inv.farmDepartureDate), 'MM'))
    );
    return Array.from(months).sort();
  }, [invoices, selectedYear]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    if (selectedFincaId !== 'all') {
      filtered = filtered.filter(inv => inv.farmId === selectedFincaId);
    }
    if (selectedCustomerId !== 'all') {
      filtered = filtered.filter(inv => inv.customerId === selectedCustomerId);
    }
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filtered = filtered.filter(inv => getYear(parseISO(inv.farmDepartureDate)) === year);
    }
     if (selectedMonth !== 'all' && selectedYear !== 'all') {
        const month = parseInt(selectedMonth) -1;
        filtered = filtered.filter(inv => parseISO(inv.farmDepartureDate).getMonth() === month);
    }
    return filtered;
  }, [invoices, selectedFincaId, selectedCustomerId, selectedYear, selectedMonth]);
  
  const invoiceDetails: InvoiceDetailReport[] = useMemo(() => {
    const fincaMap = new Map(fincas.map(f => [f.id, f.name]));
    const customerMap = new Map(customers.map(c => [c.id, c.name]));
    const filteredInvoiceIds = new Set(filteredInvoices.map(inv => inv.id));

    return filteredInvoices.map(invoice => {
        let saleValue = 0;
        let purchaseValue = 0;
        let totalStems = 0;

        invoice.items.forEach(item => {
            (item.bunches || []).forEach((bunch: BunchItem) => {
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0);
                totalStems += stems;
                if (invoice.type === 'sale' || invoice.type === 'both') {
                    saleValue += stems * (bunch.salePrice || 0);
                }
                if (invoice.type === 'purchase' || invoice.type === 'both') {
                    purchaseValue += stems * (bunch.purchasePrice || 0);
                }
            });
        });

        const relatedCreditNotes = creditNotes.filter(note => note.invoiceId === invoice.id);
        const relatedDebitNotes = debitNotes.filter(note => note.invoiceId === invoice.id);

        relatedCreditNotes.forEach(note => {
            if (note.type === 'sale') saleValue -= note.amount;
            else purchaseValue -= note.amount;
        });

        relatedDebitNotes.forEach(note => {
            if (note.type === 'sale') saleValue += note.amount;
            else purchaseValue += note.amount;
        });
        
        return {
            id: invoice.id,
            date: invoice.farmDepartureDate,
            invoiceNumber: invoice.invoiceNumber,
            farmName: fincaMap.get(invoice.farmId) || t('common.unknown'),
            customerName: customerMap.get(invoice.customerId) || t('common.unknown'),
            totalStems: totalStems,
            chargeClient: saleValue,
            chargeFarm: purchaseValue,
            profit: saleValue - purchaseValue,
        };
    }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

  }, [filteredInvoices, creditNotes, debitNotes, fincas, customers, t]);


  const monthlyData = useMemo(() => {
    const dataByMonth: Record<string, { sales: number; purchases: number }> = {};
    
    invoiceDetails.forEach(detail => {
        const monthKey = selectedYear === 'all' ? format(parseISO(detail.date), 'yyyy-MM') : format(parseISO(detail.date), 'MM');
        if (!dataByMonth[monthKey]) {
            dataByMonth[monthKey] = { sales: 0, purchases: 0 };
        }
        dataByMonth[monthKey].sales += detail.chargeClient;
        dataByMonth[monthKey].purchases += detail.chargeFarm;
    });
    
    const finalData = Object.entries(dataByMonth)
      .map(([monthKey, values]) => ({
        month: monthKey,
        sales: values.sales,
        purchases: values.purchases,
        profit: values.sales - values.purchases,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return finalData;

  }, [invoiceDetails, selectedYear]);

  const salesByColorData: ColorSalesData[] = useMemo(() => {
    const salesByColor: Record<string, { totalSales: number; colorHex: string }> = {};
    const productMap = new Map<string, Producto>(productos.map(p => [p.id, p]));

    filteredInvoices.forEach(invoice => {
      if (invoice.type === 'purchase') return;

      invoice.items.forEach(item => {
        item.bunches.forEach(bunch => {
          const product = productMap.get(bunch.productoId);
          if (product) {
            const saleValue = bunch.stemsPerBunch * bunch.bunchesPerBox * bunch.salePrice;
            if (!salesByColor[product.nombreColor]) {
              salesByColor[product.nombreColor] = { totalSales: 0, colorHex: product.color };
            }
            salesByColor[product.nombreColor].totalSales += saleValue;
          }
        });
      });
    });

    return Object.entries(salesByColor)
      .map(([nombreColor, data]) => ({
        nombreColor,
        totalSales: data.totalSales,
        colorHex: data.colorHex,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 15); // Top 15 colors
  }, [filteredInvoices, productos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const totalSales = invoiceDetails.reduce((acc, data) => acc + data.chargeClient, 0);
  const totalPurchases = invoiceDetails.reduce((acc, data) => acc + data.chargeFarm, 0);
  const totalProfit = invoiceDetails.reduce((acc, data) => acc + data.profit, 0);
  const totalStems = invoiceDetails.reduce((acc, data) => acc + data.totalStems, 0);

  const getMonthName = (monthNumber: string) => {
      const year = selectedYear !== 'all' ? parseInt(selectedYear) : new Date().getFullYear();
      const date = new Date(year, parseInt(monthNumber) - 1, 1);
      return format(date, "MMMM", { locale: dateLocale });
  };
  
  const getXAxisFormatter = (monthKey: string) => {
    if (selectedYear === 'all') {
      return format(parseISO(monthKey), "MMM yyyy", { locale: dateLocale });
    }
    return getMonthName(monthKey);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{t('reports.title')}</h2>
        <p className="text-muted-foreground">{t('reports.description')}</p>
      </div>
      
       <Card>
        <CardHeader>
            <CardTitle>{t('reports.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                    <SelectValue placeholder={t('reports.filterByFarm')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allFarms')}</SelectItem>
                    {fincas.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                    <SelectValue placeholder={t('reports.filterByCustomer')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allCustomers')}</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={(value) => {setSelectedYear(value); setSelectedMonth('all');}}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByYear')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allYears')}</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all'}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByMonth')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allMonths')}</SelectItem>
                    {availableMonths.map(m => <SelectItem key={m} value={m}>{getMonthName(m)}</SelectItem>)}
                </SelectContent>
            </Select>
        </CardContent>
       </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.sales')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.purchases')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchases)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.profit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={getXAxisFormatter} />
              <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="sales" fill="hsl(var(--primary))" name={t('reports.sales')} />
              <Bar dataKey="purchases" fill="hsl(var(--destructive))" name={t('reports.purchases')} />
              <Bar dataKey="profit" fill="hsl(var(--chart-2))" name={t('reports.profit')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.colorSalesChartTitle')}</CardTitle>
          <CardDescription>{t('reports.colorSalesChartDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesByColorData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="nombreColor" width={150} tick={<CustomYAxisTick />} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalSales" name={t('reports.sales')} layout="vertical">
                {salesByColorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.colorHex || '#8884d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.table.date')}</TableHead>
                <TableHead>{t('reports.table.invoice')}</TableHead>
                <TableHead>{t('reports.table.farm')}</TableHead>
                <TableHead>{t('reports.table.customer')}</TableHead>
                <TableHead className="text-right">{t('reports.table.totalStems')}</TableHead>
                <TableHead className="text-right">{t('reports.table.chargeFarm')}</TableHead>
                <TableHead className="text-right">{t('reports.table.chargeClient')}</TableHead>
                <TableHead className="text-right">{t('reports.table.profit')}</TableHead>
                <TableHead className="text-right">{t('common.actions.title')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceDetails.map((data) => (
                <TableRow key={data.id}>
                  <TableCell>{format(parseISO(data.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium">{data.invoiceNumber}</TableCell>
                  <TableCell>{data.farmName}</TableCell>
                  <TableCell>{data.customerName}</TableCell>
                  <TableCell className="text-right">{data.totalStems}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.chargeFarm)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.chargeClient)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(data.profit)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" title={t('invoices.view.invoiceTitle')}>
                      <Link href={`/invoices/${data.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableFooter>
                <TableRow className="font-bold text-lg">
                    <TableCell colSpan={4}>{t('reports.table.total')}</TableCell>
                    <TableCell className="text-right">{totalStems}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalProfit)}</TableCell>
                    <TableCell />
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
