'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FarmCreditNotesDownloadPdfButtonProps = {
  notes: any[];
};

export default function FarmCreditNotesDownloadPdfButton({ notes }: FarmCreditNotesDownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('farm-credit-notes-to-print');

    if (!reportElement) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el contenido para generar el PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportElement, {
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
      
      const fileName = `Reporte-Notas-de-Credito-Finca.pdf`;
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
    }
  };

  return (
    <Button onClick={handleDownloadPdf} disabled={isGenerating} variant="outline">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar PDF
    </Button>
  );
}
