
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './farm-account-statement-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type FarmAccountStatementExcelButtonProps = {
  data: StatementData;
};

export default function FarmAccountStatementExcelButton({ data }: FarmAccountStatementExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data = [
        [t('farmAccountStatement.view.title', { farmName: data.finca.name.toUpperCase() })],
        [],
        [t('farmAccountStatement.view.supplier'), data.finca.name],
        [t('farmAccountStatement.view.address'), data.finca.address],
        [t('farmAccountStatement.view.taxId'), data.finca.taxId],
        [],
        [
          t('farmAccountStatement.view.date'), 
          t('farmAccountStatement.view.invoiceNo'), 
          t('farmAccountStatement.view.supplier'),
          t('farmAccountStatement.view.consignee'),
          t('farmAccountStatement.view.charges'), 
          t('farmAccountStatement.view.creditsDebits'), 
          t('farmAccountStatement.view.payments'), 
          t('farmAccountStatement.view.balance')
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
        ws_data.push([t('farmAccountStatement.view.pendingMonth', { month: month.toUpperCase() })]);
        invoices.forEach(invoice => {
          ws_data.push([
            format(parseISO(invoice.flightDate), 'dd/MM/yyyy'),
            invoice.invoiceNumber,
            data.finca.name,
            invoice.consigneeName || 'N/A',
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
            "", "", "", t('farmAccountStatement.view.totalForMonth', { month: month.toUpperCase() }),
            monthlyTotals.total,
            monthlyTotals.creditsDebits,
            monthlyTotals.payments,
            monthlyTotals.balance
        ]);
      });

      ws_data.push([]);
      ws_data.push([
        "", "", "", t('farmAccountStatement.view.totalPending'),
        data.invoices.reduce((acc, inv) => acc + inv.total, 0),
        data.totalCredits - data.totalDebits,
        data.totalPayments,
        data.totalOutstanding
      ]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('farmAccountStatement.excel.sheetName'));

      const fileName = `${t('farmAccountStatement.excel.fileName')}-${data.finca.name.replace(/ /g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
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
      {t('farmAccountStatement.downloadExcel')}
    </Button>
  );
}
