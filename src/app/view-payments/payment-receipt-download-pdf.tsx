'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AggregatedPayment } from './view-payments-client';
import { PaymentReceiptView } from './payment-receipt-view';
import { useTranslation } from '@/context/i18n-context';

type PaymentReceiptDownloadPdfButtonProps = {
  payment: AggregatedPayment;
};

export default function PaymentReceiptDownloadPdfButton({ payment }: PaymentReceiptDownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    
    // Create a temporary container for the receipt view
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px'; // Position it off-screen
    document.body.appendChild(tempContainer);
    
    // This is a bit of a hack: React can't render to a detached element.
    // So we render a hidden element, use it for PDF generation, then remove it.
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempContainer);
    
    // Render the component inside the temporary container
    root.render(
      <div id={`printable-receipt-${payment.id}`} style={{ width: '8.5in', padding: '0.5in' }}>
        <PaymentReceiptView payment={payment} />
      </div>
    );
    
    // Allow a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const printableElement = document.getElementById(`printable-receipt-${payment.id}`);

    if (!printableElement) {
      toast({
        title: t('common.error'),
        description: t('viewPayments.pdfError'),
        variant: "destructive",
      });
      setIsGenerating(false);
      document.body.removeChild(tempContainer);
      return;
    }

    try {
       const canvas = await html2canvas(printableElement, {
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      
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

      pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
      remainingHeight -= pdfHeight;

      while (remainingHeight > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
        remainingHeight -= pdfHeight;
      }
      
      const fileName = `${t('viewPayments.receipt.pdfFileName')}-${payment.entityName.replace(/ /g, '_')}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: t('common.success'),
        description: t('common.downloadSuccess', { fileName }),
      });

    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: t('common.error'),
        description: t('viewPayments.pdfUnexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      root.unmount();
      document.body.removeChild(tempContainer);
    }
  };

  return (
    <button onClick={handleDownloadPdf} disabled={isGenerating} className="w-full flex items-center justify-start text-sm p-2 hover:bg-accent rounded-sm">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t('viewPayments.receipt.downloadPdf')}
    </button>
  );
}
