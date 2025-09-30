'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DebitNote } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type DebitNoteWithDetails = DebitNote & { consigneeName?: string };

type DebitNotesDownloadExcelButtonProps = {
  notes: DebitNoteWithDetails[];
};

export default function DebitNotesDownloadExcelButton({ notes }: DebitNotesDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data = [
        ["REPORTE DE NOTAS DE DÉBITO"],
        [],
        ["FECHA", "FACTURA #", "CLIENTE", "MOTIVO", "MONTO"]
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
      ws_data.push(["", "", "", "TOTAL", totalAmount]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Notas de Débito");

      const fileName = `Reporte-Notas-de-Debito.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Éxito",
        description: `El archivo ${fileName} se ha descargado.`,
      });

    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al generar el archivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownloadExcel} disabled={isGenerating} variant="outline">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar Excel
    </Button>
  );
}
