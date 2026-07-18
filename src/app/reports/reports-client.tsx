
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, Text } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Invoice, CreditNote, DebitNote, BunchItem, Producto, Financials, Customer, Carguera, Consignatario, Pais } from '@/lib/types';
import { format, parseISO, getYear } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { InvoiceDetailView } from '@/app/invoices/[id]/invoice-detail-view';
<<<<<<< HEAD
import { cn } from '@/lib/utils';
=======
>>>>>>> origin/main


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
<<<<<<< HEAD
  avgPrice: number;
=======
>>>>>>> origin/main
};

type PreviewData = {
  invoice: Invoice;
  customer: Customer | null;
  consignatario: Consignatario | null;
  carguera: Carguera | null;
  pais: Pais | null;
  financials: Financials;
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
<<<<<<< HEAD
  const { invoices, creditNotes, debitNotes, fincas, customers, productos, cargueras, consignatarios, paises, variedades, payments } = useAppData();
=======
  const { invoices, creditNotes, debitNotes, fincas, customers, productos, cargueras, consignatarios, paises, payments } = useAppData();
>>>>>>> origin/main
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const [selectedFincaId, setSelectedFincaId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
<<<<<<< HEAD
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'sales' | 'purchases' | 'profit'>('all');
=======
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
>>>>>>> origin/main
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.farmDepartureDate))));
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);
  
  const availableMonths = useMemo(() => {
<<<<<<< HEAD
    const monthSet = new Set<string>();
    const yearNumeric = selectedYear !== 'all' ? parseInt(selectedYear) : null;
    
    const invoicesForYear = yearNumeric === null 
      ? invoices 
      : invoices.filter(inv => getYear(parseISO(inv.farmDepartureDate)) === yearNumeric);
    
    invoicesForYear.forEach(inv => monthSet.add(format(parseISO(inv.farmDepartureDate), 'MM')));
    return Array.from(monthSet).sort();
=======
    if (selectedYear === 'all') return [];
    const months = new Set(
      invoices
        .filter(inv => getYear(parseISO(inv.farmDepartureDate)) === parseInt(selectedYear))
        .map(inv => format(parseISO(inv.farmDepartureDate), 'MM'))
    );
    return Array.from(months).sort();
>>>>>>> origin/main
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
<<<<<<< HEAD
     if (selectedMonth !== 'all') {
        const month = parseInt(selectedMonth) - 1;
=======
     if (selectedMonth !== 'all' && selectedYear !== 'all') {
        const month = parseInt(selectedMonth) -1;
>>>>>>> origin/main
        filtered = filtered.filter(inv => parseISO(inv.farmDepartureDate).getMonth() === month);
    }
    return filtered;
  }, [invoices, selectedFincaId, selectedCustomerId, selectedYear, selectedMonth]);
  
  const invoiceDetails: InvoiceDetailReport[] = useMemo(() => {
    const fincaMap = new Map(fincas.map(f => [f.id, f.name]));
    const customerMap = new Map(customers.map(c => [c.id, c.name]));
    
<<<<<<< HEAD
    let details = filteredInvoices.map(invoice => {
=======
    return filteredInvoices.map(invoice => {
>>>>>>> origin/main
        let saleValue = 0;
        let purchaseValue = 0;
        let totalStems = 0;

        invoice.items.forEach(item => {
            (item.bunches || []).forEach((bunch: BunchItem) => {
<<<<<<< HEAD
                if (selectedProductType !== 'all' && bunch.product !== selectedProductType) {
                    return;
                }

                const productLower = (bunch.product || '').toLowerCase();
                const isGyp = productLower.includes('gyp');
                
                const numBoxes = item.numberOfBoxes || 1;
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0) * numBoxes;
                totalStems += stems;
                
                if (invoice.type === 'sale' || invoice.type === 'both') {
                    if (isGyp) {
                        saleValue += (bunch.bunchesPerBox * numBoxes * (bunch.salePrice || 0));
                    } else {
                        saleValue += stems * (bunch.salePrice || 0);
                    }
                }
                if (invoice.type === 'purchase' || invoice.type === 'both') {
                    if (isGyp) {
                        purchaseValue += (bunch.bunchesPerBox * numBoxes * (bunch.purchasePrice || 0));
                    } else {
                        purchaseValue += stems * (bunch.purchasePrice || 0);
                    }
=======
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0);
                totalStems += stems;
                if (invoice.type === 'sale' || invoice.type === 'both') {
                    saleValue += stems * (bunch.salePrice || 0);
                }
                if (invoice.type === 'purchase' || invoice.type === 'both') {
                    purchaseValue += stems * (bunch.purchasePrice || 0);
>>>>>>> origin/main
                }
            });
        });

<<<<<<< HEAD
        if (selectedProductType === 'all') {
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
        }
=======
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
>>>>>>> origin/main
        
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
<<<<<<< HEAD
            avgPrice: totalStems > 0 ? saleValue / totalStems : 0,
        };
    }).filter(d => d.totalStems > 0 || Math.abs(d.chargeClient) > 0.01 || Math.abs(d.chargeFarm) > 0.01);

    if (selectedMetric === 'sales') {
      details = details.filter(d => d.chargeClient > 0);
    } else if (selectedMetric === 'purchases') {
      details = details.filter(d => d.chargeFarm > 0);
    } else if (selectedMetric === 'profit') {
      details = details.filter(d => Math.abs(d.profit) > 0.01);
    }

    return details.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  }, [filteredInvoices, creditNotes, debitNotes, fincas, customers, t, selectedMetric, selectedProductType]);
=======
        };
    }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

  }, [filteredInvoices, creditNotes, debitNotes, fincas, customers, t]);
>>>>>>> origin/main


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
<<<<<<< HEAD
      if (invoice.type === 'purchase' && selectedMetric === 'sales') return;
      if (invoice.type === 'sale' && selectedMetric === 'purchases') return;

      invoice.items.forEach(item => {
        item.bunches.forEach(bunch => {
          if (selectedProductType !== 'all' && bunch.product !== selectedProductType) {
            return;
          }

          const productLower = (bunch.product || '').toLowerCase();
          const isGyp = productLower.includes('gyp');
          const numBoxes = item.numberOfBoxes || 1;

          const product = productMap.get(bunch.productoId);
          if (product) {
            let saleValue = 0;
            if (isGyp) {
                saleValue = (bunch.bunchesPerBox * numBoxes * (bunch.salePrice || 0));
            } else {
                saleValue = bunch.stemsPerBunch * bunch.bunchesPerBox * numBoxes * (bunch.salePrice || 0);
            }
            
=======
      if (invoice.type === 'purchase') return;

      invoice.items.forEach(item => {
        item.bunches.forEach(bunch => {
          const product = productMap.get(bunch.productoId);
          if (product) {
            const saleValue = bunch.stemsPerBunch * bunch.bunchesPerBox * bunch.salePrice;
>>>>>>> origin/main
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
<<<<<<< HEAD
      .slice(0, 15);
  }, [filteredInvoices, productos, selectedMetric, selectedProductType]);
=======
      .slice(0, 15); // Top 15 colors
  }, [filteredInvoices, productos]);
>>>>>>> origin/main

  const handlePreviewClick = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const customer = customers.find(c => c.id === invoice.customerId) ?? null;
    const consignatario = (invoice.consignatarioId ? consignatarios.find(c => c.id === invoice.consignatarioId) : null) ?? null;
    const carguera = (invoice.carrierId ? cargueras.find(c => c.id === invoice.carrierId) : null) ?? null;
    const pais = (invoice.countryId ? paises.find(p => p.id === invoice.countryId) : null) ?? null;

    const financials: Financials = {
      payments: payments.filter(p => p.invoiceId === invoice.id),
      creditNotes: creditNotes.filter(cn => cn.invoiceId === invoice.id),
      debitNotes: debitNotes.filter(dn => dn.invoiceId === invoice.id),
    };

    setPreviewData({ invoice, customer, consignatario, carguera, pais, financials });
  };


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

<<<<<<< HEAD
  const getWeightedAveragePrice = () => {
    if (totalStems === 0) return 0;
    if (selectedMetric === 'purchases') return totalPurchases / totalStems;
    if (selectedMetric === 'profit') return totalProfit / totalStems;
    return totalSales / totalStems;
  };
  
  const totalAvgPricePerStem = getWeightedAveragePrice();

=======
>>>>>>> origin/main
  const getMonthName = (monthNumber: string) => {
      const year = selectedYear !== 'all' ? parseInt(selectedYear) : new Date().getFullYear();
      const date = new Date(year, parseInt(monthNumber) - 1, 1);
      return format(date, "MMMM", { locale: dateLocale });
  };
  
  const getXAxisFormatter = (monthKey: string) => {
    if (selectedYear === 'all') {
<<<<<<< HEAD
      try {
        return format(parseISO(monthKey + "-01"), "MMM yyyy", { locale: dateLocale });
      } catch (e) {
        return monthKey;
      }
=======
      return format(parseISO(monthKey), "MMM yyyy", { locale: dateLocale });
>>>>>>> origin/main
    }
    return getMonthName(monthKey);
  };

<<<<<<< HEAD
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return { value: m, name: getMonthName(m) };
  });

=======
>>>>>>> origin/main
  return (
    <>
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
<<<<<<< HEAD
            <Select value={selectedMetric} onValueChange={(v: any) => setSelectedMetric(v)}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[180px]">
                    <SelectValue placeholder={t('reports.filterByMetric')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.metricAll')}</SelectItem>
                    <SelectItem value="sales">{t('reports.sales')}</SelectItem>
                    <SelectItem value="purchases">{t('reports.purchases')}</SelectItem>
                    <SelectItem value="profit">{t('reports.profit')}</SelectItem>
                </SelectContent>
            </Select>

=======
>>>>>>> origin/main
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
<<<<<<< HEAD

            <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                    <SelectValue placeholder={t('reports.filterByProductType')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allProductTypes')}</SelectItem>
                    {variedades.map(v => <SelectItem key={v.id} value={v.nombre}>{v.nombre}</SelectItem>)}
                </SelectContent>
            </Select>

=======
>>>>>>> origin/main
            <Select value={selectedYear} onValueChange={(value) => {setSelectedYear(value); setSelectedMonth('all');}}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByYear')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allYears')}</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
<<<<<<< HEAD
             <Select value={selectedMonth} onValueChange={setSelectedMonth}>
=======
             <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all'}>
>>>>>>> origin/main
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByMonth')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allMonths')}</SelectItem>
<<<<<<< HEAD
                    {allMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.name}</SelectItem>)}
=======
                    {availableMonths.map(m => <SelectItem key={m} value={m}>{getMonthName(m)}</SelectItem>)}
>>>>>>> origin/main
                </SelectContent>
            </Select>
        </CardContent>
       </Card>

<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(selectedMetric === 'all' || selectedMetric === 'sales') && (
          <Card className={cn(selectedMetric === 'sales' && "border-primary border-2")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.sales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            </CardContent>
          </Card>
        )}
        {(selectedMetric === 'all' || selectedMetric === 'purchases') && (
          <Card className={cn(selectedMetric === 'purchases' && "border-destructive border-2")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.purchases')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPurchases)}</div>
            </CardContent>
          </Card>
        )}
        {(selectedMetric === 'all' || selectedMetric === 'profit') && (
          <Card className={cn(selectedMetric === 'profit' && "border-chart-2 border-2")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reports.profit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-accent border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.avgPrice')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAvgPricePerStem.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports.perStemGlobal')}</p>
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
              {(selectedMetric === 'all' || selectedMetric === 'sales') && (
                <Bar dataKey="sales" fill="hsl(var(--primary))" name={t('reports.sales')} />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'purchases') && (
                <Bar dataKey="purchases" fill="hsl(var(--destructive))" name={t('reports.purchases')} />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'profit') && (
                <Bar dataKey="profit" fill="hsl(var(--chart-2))" name={t('reports.profit')} />
              )}
=======
              <Bar dataKey="sales" fill="hsl(var(--primary))" name={t('reports.sales')} />
              <Bar dataKey="purchases" fill="hsl(var(--destructive))" name={t('reports.purchases')} />
              <Bar dataKey="profit" fill="hsl(var(--chart-2))" name={t('reports.profit')} />
>>>>>>> origin/main
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
<<<<<<< HEAD
                <TableHead className="text-right">{t('reports.table.avgPrice')}</TableHead>
=======
>>>>>>> origin/main
                <TableHead className="text-right">{t('reports.table.profit')}</TableHead>
                <TableHead className="text-right">{t('common.actions.title')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
<<<<<<< HEAD
              {invoiceDetails.map((data) => {
                const rowAvgPrice = data.totalStems > 0 ? (
                  selectedMetric === 'purchases' ? data.chargeFarm / data.totalStems :
                  selectedMetric === 'profit' ? data.profit / data.totalStems :
                  data.chargeClient / data.totalStems
                ) : 0;

                return (
                  <TableRow key={data.id}>
                    <TableCell>{format(parseISO(data.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{data.invoiceNumber}</TableCell>
                    <TableCell>{data.farmName}</TableCell>
                    <TableCell>{data.customerName}</TableCell>
                    <TableCell className="text-right">{data.totalStems.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.chargeFarm)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.chargeClient)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${rowAvgPrice.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(data.profit)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title={t('invoices.view.invoiceTitle')} onClick={() => handlePreviewClick(data.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
=======
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
                    <Button variant="ghost" size="icon" title={t('invoices.view.invoiceTitle')} onClick={() => handlePreviewClick(data.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
>>>>>>> origin/main
            </TableBody>
             <TableFooter>
                <TableRow className="font-bold text-lg">
                    <TableCell colSpan={4}>{t('reports.table.total')}</TableCell>
<<<<<<< HEAD
                    <TableCell className="text-right">{totalStems.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSales)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${totalAvgPricePerStem.toFixed(3)}</TableCell>
=======
                    <TableCell className="text-right">{totalStems}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSales)}</TableCell>
>>>>>>> origin/main
                    <TableCell className="text-right">{formatCurrency(totalProfit)}</TableCell>
                    <TableCell />
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <AlertDialogContent className="sm:max-w-6xl h-[90vh] flex flex-col">
            <AlertDialogHeader>
                <AlertDialogTitle>{t('invoices.view.invoiceTitle')} #{previewData?.invoice.invoiceNumber}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('invoices.historyDescription')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex-grow overflow-y-auto">
              {previewData && (
                <InvoiceDetailView
                  invoice={previewData.invoice}
                  customer={previewData.customer}
                  consignatario={previewData.consignatario}
                  carguera={previewData.carguera}
                  pais={previewData.pais}
                  financials={previewData.financials}
                />
              )}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPreviewData(null)}>{t('common.cancel')}</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
