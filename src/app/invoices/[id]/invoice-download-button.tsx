'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Invoice } from '@/lib/types';

type InvoiceDownloadButtonProps = {
  invoice: Invoice;
};

export default function InvoiceDownloadButton({ invoice }: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    const invoiceElement = document.getElementById('invoice-to-print');

    if (!invoiceElement) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el contenido para generar el PDF.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2, // Optimized from 3 to 2 for faster performance
        useCORS: true,
        logging: false,
        width: invoiceElement.scrollWidth,
        height: invoiceElement.scrollHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
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

      pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
      remainingHeight -= pdfHeight;

      while (remainingHeight > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
        remainingHeight -= pdfHeight;
      }
      
      const fileName = `Factura-${invoice.invoiceNumber.trim()}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Éxito',
        description: `El archivo ${fileName} se ha descargado.`,
      });
    } catch (error) {
      console.error("Error al procesar el PDF:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al procesar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <Button onClick={handleDownloadPdf} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {isGenerating ? 'Generando...' : 'Descargar PDF'}
    </Button>
  );
}
