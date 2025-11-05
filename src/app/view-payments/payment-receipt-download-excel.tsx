'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AggregatedPayment } from './view-payments-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type PaymentReceiptDownloadExcelButtonProps = {
  payment: AggregatedPayment;
};

export default function PaymentReceiptDownloadExcelButton({ payment }: PaymentReceiptDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data: (string | number)[][] = [
        [t('viewPayments.receipt.title')],
        [],
        [t('viewPayments.receipt.paidBy'), payment.entityName.toUpperCase()],
        [t('viewPayments.receipt.paymentDate'), format(parseISO(payment.paymentDate), 'dd/MM/yyyy')],
        [t('viewPayments.receipt.totalAmount'), payment.amount],
        [t('viewPayments.receipt.paymentMethod'), payment.paymentMethod],
      ];

      if (payment.reference) ws_data.push([t('viewPayments.receipt.reference'), payment.reference]);
      if (payment.notes) ws_data.push([t('viewPayments.receipt.notes'), payment.notes]);

      ws_data.push([]);
      ws_data.push([t('viewPayments.receipt.breakdown')]);
      ws_data.push([t('viewPayments.receipt.invoiceNo'), t('viewPayments.receipt.customer'), t('viewPayments.receipt.consignee'), t('viewPayments.receipt.amountApplied')]);

      payment.details.forEach(detail => {
        ws_data.push([
          detail.invoiceNumber,
          detail.customerName,
          detail.consigneeName,
          detail.amount,
        ]);
      });
      
      ws_data.push([]);
      ws_data.push(["", "", t('viewPayments.receipt.totalPaid'), payment.amount]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('viewPayments.receipt.sheetName'));

      const fileName = `${t('viewPayments.receipt.excelFileName')}-${payment.entityName.replace(/ /g, '_')}.xlsx`;
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
     <button onClick={handleDownloadExcel} disabled={isGenerating} className="w-full flex items-center justify-start text-sm p-2 hover:bg-accent rounded-sm">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t('viewPayments.receipt.downloadExcel')}
    </button>
  );
}
