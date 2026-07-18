
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './account-statement-client';
import { useTranslation } from '@/context/i18n-context';

type AccountStatementDownloadButtonProps = {
  data: StatementData;
};

export default function AccountStatementDownloadButton({ data }: AccountStatementDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPdf = async () => {
    const statementElement = document.getElementById('statement-to-print');

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
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(statementElement, {
        scale: 1.5, // High scale for better quality
        useCORS: true,
        logging: false,
        width: statementElement.scrollWidth,
        height: statementElement.scrollHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      
      const pdf = new jsPDF({
        orientation: 'p', // p for portrait (vertical)
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

      pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
      remainingHeight -= pdfHeight;

      while (remainingHeight > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
        remainingHeight -= pdfHeight;
      }
      
      const fileName = `Estado-de-Cuenta-${data.customer.name.replace(/ /g, '_')}.pdf`;
      pdf.save(fileName);
      
      toast({
          title: t('common.success'),
          description: t('accountStatement.downloadSuccess', { fileName }),
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
      {t('accountStatement.downloadPdf')}
    </Button>
  );
}
