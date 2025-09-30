'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StatementData } from './historical-farm-account-statement-client';
import { format, parseISO } from 'date-fns';

type HistoricalFarmAccountStatementExcelButtonProps = {
  data: StatementData;
};

export default function HistoricalFarmAccountStatementExcelButton({ data }: HistoricalFarmAccountStatementExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data = [
        ["ESTADO DE CUENTA HISTÓRICO", data.finca.name.toUpperCase()],
        [],
        ["PROVEEDOR:", data.finca.name],
        ["DIRECCIÓN:", data.finca.address],
        ["RUC:", data.finca.taxId],
        [],
        ["FECHA", "FACTURA #", "PROVEEDOR", "CARGOS", "CRÉDITOS/DÉBITOS", "PAGOS", "SALDO"]
      ];

      data.invoices.forEach(invoice => {
        ws_data.push([
          format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy'),
          invoice.invoiceNumber,
          data.finca.name,
          invoice.total,
          invoice.credits - invoice.debits,
          invoice.payments,
          invoice.balance
        ]);
      });

      ws_data.push([]);
      ws_data.push([
        "", "", "TOTAL PENDIENTE",
        data.invoices.reduce((acc, inv) => acc + inv.total, 0),
        data.totalCredits - data.totalDebits,
        data.totalPayments,
        data.totalOutstanding
      ]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estado Cuenta Histórico Finca");

      const fileName = `Estado-Cuenta-Historico-Finca-${data.finca.name.replace(/ /g, '_')}.xlsx`;
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
