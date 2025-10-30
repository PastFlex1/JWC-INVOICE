
'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AggregatedPayment } from './view-payments-client';
import { PaymentReceiptView } from './payment-receipt-view';

type PaymentReceiptDownloadPdfButtonProps = {
  payment: AggregatedPayment;
};

export default function PaymentReceiptDownloadPdfButton({ payment }: PaymentReceiptDownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    
    // Create a temporary container for the receipt view
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.id = `temp-pdf-container-${payment.id}`;
    document.body.appendChild(tempContainer);
    
    // This is a bit of a hack: React can't render to a detached element.
    // So we render a hidden element, use it for PDF generation, then remove it.
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempContainer);
    
    root.render(<PaymentReceiptView payment={payment} />);
    
    // Allow a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const receiptElement = document.querySelector(`#temp-pdf-container-${payment.id} > div`);

    if (!receiptElement) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el contenido para generar el PDF.",
        variant: "destructive",
      });
      setIsGenerating(false);
      document.body.removeChild(tempContainer);
      return;
    }

    try {
      const canvas = await html2canvas(receiptElement as HTMLElement, {
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      
      const fileName = `Recibo-de-Pago-${payment.entityName.replace(/ /g, '_')}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Éxito",
        description: `El archivo ${fileName} se ha descargado.`,
      });

    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al procesar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      // Clean up the temporary element
      root.unmount();
      document.body.removeChild(tempContainer);
    }
  };

  return (
    <button onClick={handleDownloadPdf} disabled={isGenerating} className="w-full flex items-center justify-start text-sm p-2 hover:bg-accent rounded-sm">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar PDF
    </button>
  );
}

