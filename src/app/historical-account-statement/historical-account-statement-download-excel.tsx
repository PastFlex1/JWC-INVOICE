
'use client';

import { useState } from 'react';
<<<<<<< HEAD
=======
import * as XLSX from 'xlsx';
>>>>>>> origin/main
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './historical-account-statement-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type HistoricalAccountStatementExcelButtonProps = {
  data: StatementData;
};

export default function HistoricalAccountStatementExcelButton({ data }: HistoricalAccountStatementExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

<<<<<<< HEAD
  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    try {
      const { generateStyledExcel } = await import('@/lib/excel-generator');
      const ws_data: any[][] = [
=======
  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data: (string | number)[][] = [
>>>>>>> origin/main
        [t('historicalAccountStatement.excel.title'), data.customer.name.toUpperCase()],
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

      data.invoices.forEach(invoice => {
        ws_data.push([
          format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy'),
          invoice.invoiceNumber,
          invoice.consigneeName || '',
          invoice.total,
          invoice.credits - invoice.debits,
          invoice.payments,
          invoice.balance
        ]);
      });

      ws_data.push([]);
      ws_data.push([
        "", "", "", t('accountStatement.view.totalPending'),
        data.invoices.reduce((acc, inv) => acc + inv.total, 0),
        data.totalCredits - data.totalDebits,
        data.totalPayments,
        data.totalOutstanding
      ]);

<<<<<<< HEAD
      const colWidths = [12, 15, 30, 15, 15, 15, 15];
      const fileName = `${t('historicalAccountStatement.excel.fileName')}-${data.customer.name.replace(/ /g, '_')}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: t('historicalAccountStatement.excel.sheetName'),
        colWidths,
      });
=======
      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('historicalAccountStatement.excel.sheetName'));

      const fileName = `${t('historicalAccountStatement.excel.fileName')}-${data.customer.name.replace(/ /g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
>>>>>>> origin/main
      
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
