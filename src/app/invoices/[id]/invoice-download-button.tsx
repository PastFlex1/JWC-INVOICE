'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Invoice } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';

type InvoiceDownloadButtonProps = {
  invoice: Invoice;
};

export default function InvoiceDownloadButton({ invoice }: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPdf = async () => {
    const invoiceElement = document.getElementById('invoice-to-print');

    if (!invoiceElement) {
      toast({
        title: t('common.error'),
        description: t('invoices.toast.pdfError'),
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(invoiceElement, {
        scale: 1.5, // Optimized from 3 to 2 for faster performance
        useCORS: true,
        logging: false,
        width: invoiceElement.scrollWidth,
        height: invoiceElement.scrollHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'pt', 'a4');

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
      
      const fileName = `${t('invoices.toast.pdfFileName')}-${invoice.invoiceNumber.trim()}.pdf`;
      pdf.save(fileName);

      toast({
        title: t('common.success'),
        description: t('common.downloadSuccess', { fileName }),
      });
    } catch (error) {
      console.error("Error al procesar el PDF:", error);
      toast({
        title: t('common.error'),
        description: t('invoices.toast.pdfUnexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <Button onClick={handleDownloadPdf} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {isGenerating ? t('invoices.actions.generating') : t('invoices.actions.downloadPdf')}
    </Button>
  );
}
