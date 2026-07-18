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
import type { StatementData } from './historical-farm-account-statement-client';
import { useTranslation } from '@/context/i18n-context';

type HistoricalFarmAccountStatementDownloadButtonProps = {
  data: StatementData;
};

export default function HistoricalFarmAccountStatementDownloadButton({ data }: HistoricalFarmAccountStatementDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPdf = async () => {
    const statementElement = document.getElementById('historical-farm-statement-to-print');

    if (!statementElement) {
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
      const canvas = await html2canvas(statementElement, {
        scale: 1.5,
=======
      const canvas = await html2canvas(statementElement, {
        scale: 3,
>>>>>>> origin/main
        useCORS: true,
        logging: false,
        width: statementElement.scrollWidth,
        height: statementElement.scrollHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

<<<<<<< HEAD
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
=======
      const imgData = canvas.toDataURL('image/png');
>>>>>>> origin/main
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const ratio = pdfWidth / canvasWidth;
      const imgHeight = canvasHeight * ratio;
      
      const x = (pdfWidth - (canvasWidth * ratio)) / 2;

      let position = 0;
      let remainingHeight = imgHeight;

<<<<<<< HEAD
      pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
=======
      pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
>>>>>>> origin/main
      remainingHeight -= pdfHeight;

      while (remainingHeight > 0) {
        position -= pdfHeight;
        pdf.addPage();
<<<<<<< HEAD
        pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
=======
        pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
>>>>>>> origin/main
        remainingHeight -= pdfHeight;
      }
      
      const fileName = `${t('historicalFarmAccountStatement.pdf.fileName')}-${data.finca.name.replace(/ /g, '_')}.pdf`;
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
      {t('farmAccountStatement.downloadPdf')}
    </Button>
  );
}
