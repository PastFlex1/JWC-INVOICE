'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DebitNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type DebitNoteWithDetails = DebitNote & { farmName?: string };

type FarmDebitNotesDownloadExcelButtonProps = {
  notes: DebitNoteWithDetails[];
};

export default function FarmDebitNotesDownloadExcelButton({ notes }: FarmDebitNotesDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data: (string | number)[][] = [
        [t('debitNotes.farm.reportTitle')],
        [],
        [
            t('debitNotes.farm.list.date'), 
            t('debitNotes.farm.list.invoice'), 
            t('debitNotes.farm.list.farm'), 
            t('debitNotes.farm.list.reason'), 
            t('debitNotes.farm.list.amount')
        ]
      ];

      notes.forEach(note => {
        ws_data.push([
          format(parseISO(note.date), 'dd/MM/yyyy'),
          note.invoiceNumber,
          note.farmName || 'N/A',
          note.reason,
          note.amount
        ]);
      });

      const totalAmount = notes.reduce((sum, note) => sum + note.amount, 0);
      ws_data.push([]);
      ws_data.push(["", "", "", t('debitNotes.farm.total'), totalAmount]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('debitNotes.farm.sheetName'));

      const fileName = `${t('debitNotes.farm.excelFileName')}.xlsx`;
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
      {t('debitNotes.farm.downloadExcel')}
    </Button>
  );
}
