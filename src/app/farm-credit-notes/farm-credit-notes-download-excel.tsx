
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CreditNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';

type CreditNoteWithDetails = CreditNote & { farmName?: string };

type FarmCreditNotesDownloadExcelButtonProps = {
  notes: CreditNoteWithDetails[];
};

export default function FarmCreditNotesDownloadExcelButton({ notes }: FarmCreditNotesDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    try {
      const { generateStyledExcel } = await import('@/lib/excel-generator');
      const ws_data: any[][] = [
        [t('creditNotes.farm.reportTitle')],
        [],
        [
          t('creditNotes.farm.list.date'), 
          t('creditNotes.farm.list.invoice'), 
          t('creditNotes.farm.list.farm'), 
          t('creditNotes.farm.list.reason'), 
          t('creditNotes.farm.list.amount')
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
      ws_data.push(["", "", "", t('creditNotes.farm.total'), totalAmount]);

      const colWidths = [12, 15, 30, 40, 15];
      const fileName = `${t('creditNotes.farm.excelFileName')}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: t('creditNotes.farm.sheetName'),
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
      {t('creditNotes.farm.downloadExcel')}
    </Button>
  );
}
