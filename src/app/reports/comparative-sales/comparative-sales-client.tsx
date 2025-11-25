'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Invoice, BunchItem } from '@/lib/types';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { es, enUS } from 'date-fns/locale';


type ComparativeData = {
  month: number;
  monthName: string;
  fincaId: string;
  fincaName: string;
  customerId: string;
  customerName: string;
  chargeFarm: number;
  chargeClient: { [year: string]: number };
};

export function ComparativeSalesClient() {
  const { invoices, fincas, customers } = useAppData();
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const [selectedFincaId, setSelectedFincaId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f.name])), [fincas]);
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);

  const allAvailableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.farmDepartureDate))));
    return Array.from(years).sort((a,b) => b - a);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    if (selectedFincaId !== 'all') {
      filtered = filtered.filter(inv => inv.farmId === selectedFincaId);
    }
    if (selectedCustomerId !== 'all') {
      filtered = filtered.filter(inv => inv.customerId === selectedCustomerId);
    }
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(inv => getMonth(parseISO(inv.farmDepartureDate)) === parseInt(selectedMonth));
    }
    if (selectedYear !== 'all') {
      filtered = filtered.filter(inv => getYear(parseISO(inv.farmDepartureDate)) === parseInt(selectedYear));
    }
    return filtered;
  }, [invoices, selectedFincaId, selectedCustomerId, selectedMonth, selectedYear]);


  const comparativeData = useMemo(() => {
    const data: Record<string, ComparativeData> = {};

    filteredInvoices.forEach(invoice => {
        const month = getMonth(parseISO(invoice.farmDepartureDate));
        const year = getYear(parseISO(invoice.farmDepartureDate));
        const key = `${month}-${invoice.farmId}-${invoice.customerId}`;

        if (!data[key]) {
            data[key] = {
                month: month,
                monthName: format(new Date(year, month), 'MMMM', { locale: dateLocale }),
                fincaId: invoice.farmId,
                fincaName: fincaMap.get(invoice.farmId) || t('common.unknown'),
                customerId: invoice.customerId,
                customerName: customerMap.get(invoice.customerId) || t('common.unknown'),
                chargeFarm: 0,
                chargeClient: {},
            };
        }

        let saleValue = 0;
        let purchaseValue = 0;

        invoice.items.forEach(item => {
            (item.bunches || []).forEach((bunch: BunchItem) => {
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0);
                saleValue += stems * (bunch.salePrice || 0);
                purchaseValue += stems * (bunch.purchasePrice || 0);
            });
        });
        
        data[key].chargeFarm += purchaseValue;
        if (!data[key].chargeClient[year]) {
            data[key].chargeClient[year] = 0;
        }
        data[key].chargeClient[year] += saleValue;
    });

    return Object.values(data).sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        if (a.fincaName !== b.fincaName) return a.fincaName.localeCompare(b.fincaName);
        return a.customerName.localeCompare(b.customerName);
    });
  }, [filteredInvoices, fincaMap, customerMap, t, dateLocale]);
  
  const displayedYears = useMemo(() => {
    if (selectedYear !== 'all') {
      return [parseInt(selectedYear)];
    }
    const years = new Set(filteredInvoices.map(inv => getYear(parseISO(inv.farmDepartureDate))));
    return Array.from(years).sort();
  }, [filteredInvoices, selectedYear]);

  const formatCurrency = (value?: number) => {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date(2000, monthNumber, 1);
    return format(date, "MMMM", { locale: dateLocale });
  };
  
  const allMonths = Array.from({length: 12}, (_, i) => ({ value: String(i), name: getMonthName(i) }));


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{t('comparativeReport.title')}</h2>
        <p className="text-muted-foreground">{t('comparativeReport.description')}</p>
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
             <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByYear')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allYears')}</SelectItem>
                    {allAvailableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[150px]">
                    <SelectValue placeholder={t('reports.filterByMonth')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('reports.allMonths')}</SelectItem>
                    {allMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </CardContent>
       </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('comparativeReport.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('comparativeReport.table.month')}</TableHead>
                <TableHead>{t('comparativeReport.table.farm')}</TableHead>
                <TableHead>{t('comparativeReport.table.customer')}</TableHead>
                <TableHead className="text-right">{t('comparativeReport.table.chargeFarm')}</TableHead>
                {displayedYears.map(year => (
                  <TableHead key={year} className="text-right">{t('comparativeReport.table.chargeClient')} {year}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparativeData.map((data, index) => (
                <TableRow key={index}>
                  <TableCell>{data.monthName}</TableCell>
                  <TableCell>{data.fincaName}</TableCell>
                  <TableCell>{data.customerName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.chargeFarm)}</TableCell>
                  {displayedYears.map(year => (
                    <TableCell key={year} className="text-right">{formatCurrency(data.chargeClient[year])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3}>{t('reports.table.total')}</TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(comparativeData.reduce((acc, curr) => acc + curr.chargeFarm, 0))}
                    </TableCell>
                    {displayedYears.map(year => (
                        <TableCell key={year} className="text-right font-bold">
                            {formatCurrency(comparativeData.reduce((acc, curr) => acc + (curr.chargeClient[year] || 0), 0))}
                        </TableCell>
                    ))}
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
