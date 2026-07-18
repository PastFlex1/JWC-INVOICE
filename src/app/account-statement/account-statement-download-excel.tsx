
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './account-statement-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type AccountStatementExcelButtonProps = {
  data: StatementData;
};

export default function AccountStatementExcelButton({ data }: AccountStatementExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    try {
      const { generateStyledExcel } = await import('@/lib/excel-generator');
      const ws_data: any[][] = [
        [t('accountStatement.excel.title'), data.customer.name.toUpperCase()],
        [],
        [t('accountStatement.excel.customer'), data.customer.name],
        [t('accountStatement.excel.address'), data.customer.address],
        [t('accountStatement.excel.city'), `${data.customer.estadoCiudad}, ${data.customer.pais}`],
        [],
        [
          t('accountStatement.view.date'), 
          t('accountStatement.view.invoiceNo'), 
          t('accountStatement.view.customer'), 
          t('accountStatement.view.charges'), 
          t('accountStatement.view.creditsDebits'), 
          t('accountStatement.view.payments'), 
          t('accountStatement.view.balance')
        ]
      ];

      const groupedInvoices = data.invoices.reduce((acc, invoice) => {
        const month = format(parseISO(invoice.flightDate), 'MMMM yyyy');
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(invoice);
        return acc;
      }, {} as Record<string, typeof data.invoices>);

      Object.entries(groupedInvoices).forEach(([month, invoices]) => {
        ws_data.push([t('accountStatement.view.pendingMonth', { month: month.toUpperCase() })]);
        invoices.forEach(invoice => {
          ws_data.push([
            format(parseISO(invoice.flightDate), 'dd/MM/yyyy'),
            invoice.invoiceNumber,
            data.customer.name,
            invoice.total,
            invoice.credits - invoice.debits,
            invoice.payments,
            invoice.balance
          ]);
        });
        const monthlyTotals = invoices.reduce(
            (acc, inv) => {
                acc.total += inv.total;
                acc.creditsDebits += inv.credits - inv.debits;
                acc.payments += inv.payments;
                acc.balance += inv.balance;
                return acc;
            },
            { total: 0, creditsDebits: 0, payments: 0, balance: 0 }
        );
        ws_data.push([
            "", "", t('accountStatement.view.totalForMonth', { month: month.toUpperCase() }),
            monthlyTotals.total,
            monthlyTotals.creditsDebits,
            monthlyTotals.payments,
            monthlyTotals.balance
        ]);
      });

      ws_data.push([]);
      ws_data.push([
        "", "", t('accountStatement.view.totalPending'),
        data.invoices.reduce((acc, inv) => acc + inv.total, 0),
        data.totalCredits - data.totalDebits,
        data.totalPayments,
        data.totalOutstanding
      ]);

      const colWidths = [12, 15, 30, 15, 15, 15, 15];
      const fileName = `${t('accountStatement.excel.fileName')}-${data.customer.name.replace(/ /g, '_')}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: t('accountStatement.excel.sheetName'),
        colWidths,
      });
      
      toast({
        title: t('common.success'),
        description: t('common.downloadSuccess', { fileName }),
      });

    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: t('common.error'),
        description: t('common.excelError'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownloadExcel} disabled={isGenerating} variant="outline">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t('accountStatement.downloadExcel')}
    </Button>
  );
}
