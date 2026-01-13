
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
import type { Invoice, BunchItem } from '@/lib/types';
import { format, parseISO, getYear } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

type CustomerReportData = {
  customerId: string;
  customerName: string;
  totalStems: number;
  totalPurchaseValue: number;
  totalSaleValue: number;
  totalProfit: number;
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <Text x={0} y={0} dy={5} textAnchor="end" fill="#666" fontSize={12}>
        {payload.value}
      </Text>
    </g>
  );
};

export function CustomerReportClient() {
  const { invoices, fincas, customers } = useAppData();
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const [selectedFincaId, setSelectedFincaId] = useState<string>('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (customers.length > 0) {
        setSelectedCustomerIds(customers.map(c => c.id));
    }
  }, [customers]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => inv.type === 'sale' || inv.type === 'both');
    if (selectedFincaId !== 'all') {
      filtered = filtered.filter(inv => inv.farmId === selectedFincaId);
    }
    if (selectedCustomerIds.length > 0) {
      const customerIdSet = new Set(selectedCustomerIds);
      filtered = filtered.filter(inv => customerIdSet.has(inv.customerId));
    }
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      filtered = filtered.filter(inv => getYear(parseISO(inv.farmDepartureDate)) === year);
    }
    if (selectedMonth !== 'all' && selectedYear !== 'all') {
      const month = parseInt(selectedMonth) - 1;
      filtered = filtered.filter(inv => parseISO(inv.farmDepartureDate).getMonth() === month);
    }
    return filtered;
  }, [invoices, selectedFincaId, selectedCustomerIds, selectedYear, selectedMonth]);

  const customerReportData: CustomerReportData[] = useMemo(() => {
    const dataByCustomer: Record<string, CustomerReportData> = {};

    filteredInvoices.forEach(invoice => {
      const customerId = invoice.customerId;
      if (!dataByCustomer[customerId]) {
        dataByCustomer[customerId] = {
          customerId,
          customerName: customers.find(c => c.id === customerId)?.name || 'Unknown',
          totalStems: 0,
          totalPurchaseValue: 0,
          totalSaleValue: 0,
          totalProfit: 0,
        };
      }

      invoice.items.forEach(item => {
        (item.bunches || []).forEach((bunch: BunchItem) => {
          const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0) * (item.numberOfBoxes || 1);
          const purchaseValue = stems * (bunch.purchasePrice || 0);
          const saleValue = stems * (bunch.salePrice || 0);
          
          dataByCustomer[customerId].totalStems += stems;
          dataByCustomer[customerId].totalPurchaseValue += purchaseValue;
          dataByCustomer[customerId].totalSaleValue += saleValue;
        });
      });
    });

    Object.values(dataByCustomer).forEach(customerData => {
        customerData.totalProfit = customerData.totalSaleValue - customerData.totalPurchaseValue;
    });

    return Object.values(dataByCustomer).sort((a, b) => b.totalSaleValue - a.totalSaleValue);
  }, [filteredInvoices, customers]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const getMonthName = (monthNumber: string) => {
      const year = selectedYear !== 'all' ? parseInt(selectedYear) : new Date().getFullYear();
      const date = new Date(year, parseInt(monthNumber) - 1, 1);
      return format(date, "MMMM", { locale: dateLocale });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{t('customerReport.title')}</h2>
        <p className="text-muted-foreground">{t('customerReport.description')}</p>
      </div>
      
       <Card>
        <CardHeader>
            <CardTitle>{t('reports.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]"><SelectValue placeholder={t('reports.filterByFarm')} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allFarms')}</SelectItem>
                    {fincas.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto md:min-w-[200px]">
                   {selectedCustomerIds.length === 0 ? t('reports.selectCustomers') : selectedCustomerIds.length === customers.length ? t('reports.allCustomers') : t('reports.customersSelected', { count: selectedCustomerIds.length })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{t('reports.filterByCustomer')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {customers.map(c => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={selectedCustomerIds.includes(c.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCustomerIds(prev => 
                        checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                      );
                    }}
                  >
                    {c.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={selectedYear} onValueChange={(value) => {setSelectedYear(value); setSelectedMonth('all');}}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]"><SelectValue placeholder={t('reports.filterByYear')} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allYears')}</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all'}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]"><SelectValue placeholder={t('reports.filterByMonth')} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allMonths')}</SelectItem>
                    {availableMonths.map(m => <SelectItem key={m} value={m}>{getMonthName(m)}</SelectItem>)}
                </SelectContent>
            </Select>
        </CardContent>
       </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customerReport.chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={customerReportData.slice(0, 15)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="customerName" width={150} tick={<CustomYAxisTick />} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalSaleValue" name={t('reports.sales')} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customerReport.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customerReport.table.customer')}</TableHead>
                <TableHead className="text-right">{t('customerReport.table.totalStems')}</TableHead>
                <TableHead className="text-right">{t('customerReport.table.purchaseValue')}</TableHead>
                <TableHead className="text-right">{t('customerReport.table.saleValue')}</TableHead>
                <TableHead className="text-right">{t('customerReport.table.profit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerReportData.length > 0 ? (
                 customerReportData.map((data) => (
                  <TableRow key={data.customerId}>
                    <TableCell className="font-medium">{data.customerName}</TableCell>
                    <TableCell className="text-right">{data.totalStems.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalPurchaseValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalSaleValue)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(data.totalProfit)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">{t('reports.noData')}</TableCell>
                </TableRow>
              )}
            </TableBody>
            {customerReportData.length > 0 && (
              <TableFooter>
                  <TableRow>
                      <TableCell>{t('reports.table.total')}</TableCell>
                      <TableCell className="text-right font-bold">
                          {customerReportData.reduce((acc, curr) => acc + curr.totalStems, 0).toLocaleString()}
                      </TableCell>
                       <TableCell className="text-right font-bold">
                          {formatCurrency(customerReportData.reduce((acc, curr) => acc + curr.totalPurchaseValue, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                          {formatCurrency(customerReportData.reduce((acc, curr) => acc + curr.totalSaleValue, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                          {formatCurrency(customerReportData.reduce((acc, curr) => acc + curr.totalProfit, 0))}
                      </TableCell>
                  </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
