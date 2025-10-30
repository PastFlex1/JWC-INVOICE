
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AggregatedPayment } from './view-payments-client';
import { format, parseISO } from 'date-fns';

type PaymentReceiptDownloadExcelButtonProps = {
  payment: AggregatedPayment;
};

export default function PaymentReceiptDownloadExcelButton({ payment }: PaymentReceiptDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data: (string | number)[][] = [
        ["RECIBO DE PAGO"],
        [],
        ["Pagado por:", payment.entityName.toUpperCase()],
        ["Fecha de Pago:", format(parseISO(payment.paymentDate), 'dd/MM/yyyy')],
        ["Monto Total:", payment.amount],
        ["Método de Pago:", payment.paymentMethod],
      ];

      if (payment.reference) ws_data.push(["Referencia/Banco:", payment.reference]);
      if (payment.notes) ws_data.push(["Notas:", payment.notes]);

      ws_data.push([]);
      ws_data.push(["Desglose de Pago:"]);
      ws_data.push(["N° Factura", "Cliente", "Consignatario", "Monto Aplicado"]);

      payment.details.forEach(detail => {
        ws_data.push([
          detail.invoiceNumber,
          detail.customerName,
          detail.consigneeName,
          detail.amount,
        ]);
      });
      
      ws_data.push([]);
      ws_data.push(["", "", "TOTAL PAGADO", payment.amount]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Recibo de Pago");

      const fileName = `Recibo-de-Pago-${payment.entityName.replace(/ /g, '_')}.xlsx`;
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
     <button onClick={handleDownloadExcel} disabled={isGenerating} className="w-full flex items-center justify-start text-sm p-2 hover:bg-accent rounded-sm">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar Excel
    </button>
  );
}

