
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './historical-farm-account-statement-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type HistoricalFarmAccountStatementExcelButtonProps = {
  data: StatementData;
};

export default function HistoricalFarmAccountStatementExcelButton({ data }: HistoricalFarmAccountStatementExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    try {
      const { generateStyledExcel } = await import('@/lib/excel-generator');
      const ws_data: any[][] = [
        [t('historicalFarmAccountStatement.excel.title'), data.finca.name.toUpperCase()],
        [],
        [t('farmAccountStatement.view.supplier'), data.finca.name],
        [t('farmAccountStatement.view.address'), data.finca.address],
        [t('farmAccountStatement.view.taxId'), data.finca.taxId],
        [],
        [
            t('farmAccountStatement.view.date'), 
            t('farmAccountStatement.view.invoiceNo'), 
            t('farmAccountStatement.view.supplier'), 
            t('farmAccountStatement.view.charges'), 
            t('farmAccountStatement.view.creditsDebits'), 
            t('farmAccountStatement.view.payments'), 
            t('farmAccountStatement.view.balance')
        ]
      ];

      data.invoices.forEach(invoice => {
        ws_data.push([
          format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy'),
          invoice.invoiceNumber,
          data.finca.name,
          invoice.total,
          invoice.credits - invoice.debits,
          invoice.payments,
          invoice.balance
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

      const colWidths = [12, 15, 30, 15, 15, 15, 15];
      const fileName = `${t('historicalFarmAccountStatement.excel.fileName')}-${data.finca.name.replace(/ /g, '_')}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: t('historicalFarmAccountStatement.excel.sheetName'),
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
      {t('farmAccountStatement.downloadExcel')}
    </Button>
  );
}
