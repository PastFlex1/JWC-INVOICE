'use client';

import { useMemo } from 'react';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { Invoice, CreditNote, DebitNote, BunchItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type MonthlyData = {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
};

export function ReportsClient() {
  const { invoices, creditNotes, debitNotes } = useAppData();
  const { t, locale } = useTranslation();

  const monthlyData = useMemo(() => {
    const dataByMonth: Record<string, { sales: number; purchases: number }> = {};

    invoices.forEach((invoice) => {
      const month = format(parseISO(invoice.farmDepartureDate), 'yyyy-MM');
      if (!dataByMonth[month]) {
        dataByMonth[month] = { sales: 0, purchases: 0 };
      }

      let saleValue = 0;
      let purchaseValue = 0;

      invoice.items.forEach(item => {
        item.bunches.forEach((bunch: BunchItem) => {
          const stems = bunch.stemsPerBunch * bunch.bunchesPerBox;
          if (invoice.type === 'sale' || invoice.type === 'both') {
            saleValue += stems * bunch.salePrice;
          }
          if (invoice.type === 'purchase' || invoice.type === 'both') {
            purchaseValue += stems * bunch.purchasePrice;
          }
        });
      });

      dataByMonth[month].sales += saleValue;
      dataByMonth[month].purchases += purchaseValue;
    });

    creditNotes.forEach(note => {
        const invoice = invoices.find(inv => inv.id === note.invoiceId);
        if(!invoice) return;
        const month = format(parseISO(invoice.farmDepartureDate), 'yyyy-MM');
        if(dataByMonth[month]){
            if(note.type === 'sale') dataByMonth[month].sales -= note.amount;
            else dataByMonth[month].purchases -= note.amount;
        }
    });

    debitNotes.forEach(note => {
        const invoice = invoices.find(inv => inv.id === note.invoiceId);
        if(!invoice) return;
        const month = format(parseISO(invoice.farmDepartureDate), 'yyyy-MM');
        if(dataByMonth[month]){
            if(note.type === 'sale') dataByMonth[month].sales += note.amount;
            else dataByMonth[month].purchases += note.amount;
        }
    });

    return Object.entries(dataByMonth)
      .map(([month, values]) => ({
        month,
        sales: values.sales,
        purchases: values.purchases,
        profit: values.sales - values.purchases,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices, creditNotes, debitNotes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const totalSales = monthlyData.reduce((acc, data) => acc + data.sales, 0);
  const totalPurchases = monthlyData.reduce((acc, data) => acc + data.purchases, 0);
  const totalProfit = monthlyData.reduce((acc, data) => acc + data.profit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{t('reports.title')}</h2>
        <p className="text-muted-foreground">{t('reports.description')}</p>
      </div>

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
              <XAxis 
                dataKey="month" 
                tickFormatter={(str) => format(parseISO(str), "MMM yyyy", { locale: locale === 'es' ? es : undefined })} 
              />
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
          <CardTitle>{t('reports.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.month')}</TableHead>
                <TableHead className="text-right">{t('reports.sales')}</TableHead>
                <TableHead className="text-right">{t('reports.purchases')}</TableHead>
                <TableHead className="text-right">{t('reports.profit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data) => (
                <TableRow key={data.month}>
                  <TableCell className="font-medium">{format(parseISO(data.month), "MMMM yyyy", { locale: locale === 'es' ? es : undefined })}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.sales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.purchases)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(data.profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableFooter>
                <TableRow className="font-bold text-lg">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalPurchases)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalProfit)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
