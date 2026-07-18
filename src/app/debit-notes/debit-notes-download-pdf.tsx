'use client';

import { useState } from 'react';
<<<<<<< HEAD
=======
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
>>>>>>> origin/main
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DebitNote } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';

type DebitNotesDownloadPdfButtonProps = {
  notes: DebitNote[];
};

export default function DebitNotesDownloadPdfButton({ notes }: DebitNotesDownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('debit-notes-to-print');

    if (!reportElement) {
      toast({
        title: t('common.error'),
        description: t('accountStatement.pdfError'),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
<<<<<<< HEAD
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportElement, {
        scale: 1.5,
=======
      const canvas = await html2canvas(reportElement, {
        scale: 3,
>>>>>>> origin/main
        useCORS: true,
        logging: false,
      });

<<<<<<< HEAD
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
=======
      const imgData = canvas.toDataURL('image/png');
>>>>>>> origin/main
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
<<<<<<< HEAD
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth * ratio, imgHeight * ratio);
=======
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
>>>>>>> origin/main
      
      const fileName = `${t('debitNotes.pdfFileName')}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: t('common.success'),
        description: t('common.downloadSuccess', { fileName }),
      });

    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: t('common.error'),
        description: t('accountStatement.pdfUnexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownloadPdf} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t('debitNotes.downloadPdf')}
    </Button>
  );
}
