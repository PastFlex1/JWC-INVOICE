
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Invoice, BunchItem } from '@/lib/types';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


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

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
];

export function ComparativeSalesClient() {
  const { invoices, fincas, customers } = useAppData();
  const { t, locale } = useTranslation();
  const dateLocale = useMemo(() => (locale === 'es' ? es : enUS), [locale]);

  const [selectedFincaId, setSelectedFincaId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  
  const fincaMap = useMemo(() => new Map(fincas.map(f => [f.id, f.name])), [fincas]);
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);

  const allAvailableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => getYear(parseISO(inv.farmDepartureDate))));
    return Array.from(years).sort((a,b) => b - a).map(String);
  }, [invoices]);

  useEffect(() => {
    if (allAvailableYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears(allAvailableYears);
    }
  }, [allAvailableYears, selectedYears]);

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
    if (selectedYears.length > 0) {
      const numericYears = selectedYears.map(Number);
      filtered = filtered.filter(inv => numericYears.includes(getYear(parseISO(inv.farmDepartureDate))));
    }
    return filtered;
  }, [invoices, selectedFincaId, selectedCustomerId, selectedMonth, selectedYears]);


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
            const numBoxes = item.numberOfBoxes || 1;
            (item.bunches || []).forEach((bunch: BunchItem) => {
                const productLower = (bunch.product || '').toLowerCase();
                const isGyp = productLower.includes('gyp');
                const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0) * numBoxes;
                
                if (isGyp) {
                    saleValue += (bunch.bunchesPerBox * numBoxes * (bunch.salePrice || 0));
                    purchaseValue += (bunch.bunchesPerBox * numBoxes * (bunch.purchasePrice || 0));
                } else {
                    saleValue += stems * (bunch.salePrice || 0);
                    purchaseValue += stems * (bunch.purchasePrice || 0);
                }
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

  const chartData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      monthName: format(new Date(2000, i, 1), 'MMM', { locale: dateLocale }),
    })) as any[];

    filteredInvoices.forEach(invoice => {
      const month = getMonth(parseISO(invoice.farmDepartureDate));
      const year = getYear(parseISO(invoice.farmDepartureDate)).toString();
      
      let saleValue = 0;
      invoice.items.forEach(item => {
        const numBoxes = item.numberOfBoxes || 1;
        (item.bunches || []).forEach((bunch: BunchItem) => {
          const productLower = (bunch.product || '').toLowerCase();
          const isGyp = productLower.includes('gyp');
          const stems = (bunch.stemsPerBunch || 0) * (bunch.bunchesPerBox || 0) * numBoxes;
          
          if (isGyp) {
            saleValue += (bunch.bunchesPerBox * numBoxes * (bunch.salePrice || 0));
          } else {
            saleValue += stems * (bunch.salePrice || 0);
          }
        });
      });

      if (!data[month][year]) {
        data[month][year] = 0;
      }
      data[month][year] += saleValue;
    });

    return data;
  }, [filteredInvoices, dateLocale]);
  
  const displayedYears = useMemo(() => {
    return selectedYears.sort((a, b) => Number(a) - Number(b));
  }, [selectedYears]);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto md:min-w-[200px]">
                    {selectedYears.length === 0 ? t('reports.selectYears') : selectedYears.length === allAvailableYears.length ? t('reports.allYears') : selectedYears.join(', ')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('reports.filterByYear')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allAvailableYears.map(year => (
                  <DropdownMenuCheckboxItem
                    key={year}
                    checked={selectedYears.includes(year)}
                    onCheckedChange={(checked) => {
                      setSelectedYears(prev => 
                        checked ? [...prev, year] : prev.filter(y => y !== year)
                      );
                    }}
                  >
                    {year}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
          <CardTitle>{t('comparativeReport.chartTitle')}</CardTitle>
          <CardDescription>{t('comparativeReport.chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="monthName" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                {displayedYears.map((year, index) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    name={year}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
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
              {comparativeData.length > 0 ? (
                 comparativeData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell>{data.monthName}</TableCell>
                    <TableCell>{data.fincaName}</TableCell>
                    <TableCell>{data.customerName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.chargeFarm)}</TableCell>
                    {displayedYears.map(year => (
                      <TableCell key={year} className="text-right">{formatCurrency(data.chargeClient[year])}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4 + displayedYears.length} className="text-center">
                    {t('reports.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {comparativeData.length > 0 && (
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
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
