
'use client';

import { useState } from 'react';
<<<<<<< HEAD
=======
import * as XLSX from 'xlsx';
>>>>>>> origin/main
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DebitNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type DebitNoteWithDetails = DebitNote & { consigneeName?: string };

type DebitNotesDownloadExcelButtonProps = {
  notes: DebitNoteWithDetails[];
};

export default function DebitNotesDownloadExcelButton({ notes }: DebitNotesDownloadExcelButtonProps) {
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
        [t('debitNotes.reportTitle')],
        [],
        [
          t('debitNotes.list.date'), 
          t('debitNotes.list.invoice'), 
          t('debitNotes.list.consignee'), 
          t('debitNotes.list.reason'), 
          t('debitNotes.list.amount')
        ]
      ];

      notes.forEach(note => {
        ws_data.push([
          format(parseISO(note.date), 'dd/MM/yyyy'),
          note.invoiceNumber,
          note.consigneeName || 'N/A',
          note.reason,
          note.amount
        ]);
      });

      const totalAmount = notes.reduce((sum, note) => sum + note.amount, 0);
      ws_data.push([]);
      ws_data.push(["", "", "", t('debitNotes.total'), totalAmount]);

<<<<<<< HEAD
      const colWidths = [12, 15, 30, 40, 15];
      const fileName = `${t('debitNotes.excelFileName')}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: t('debitNotes.sheetName'),
        colWidths,
      });
=======
      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('debitNotes.sheetName'));

      const fileName = `${t('debitNotes.excelFileName')}.xlsx`;
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
      {t('debitNotes.downloadExcel')}
    </Button>
  );
}
