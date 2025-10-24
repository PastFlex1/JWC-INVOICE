'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import type { Invoice, Customer, Consignatario, Carguera, Pais, Financials } from '@/lib/types';

type InvoiceDownloadExcelButtonProps = {
  invoice: Invoice;
  customer: Customer | null;
  consignatario: Consignatario | null;
  carguera: Carguera | null;
  pais: Pais | null;
  financials: Financials;
};

export default function InvoiceDownloadExcelButton({ invoice, customer, consignatario, carguera, pais, financials }: InvoiceDownloadExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const isNational = customer?.type === 'National';

  const totals = useMemo(() => {
    let totalBoxes = 0;
    let totalBunches = 0;
    let totalStems = 0;
    let totalFob = 0;
    let totalBoxTypeValue = 0;
    const boxTypeValues: { [key: string]: number } = { eb: 0.13, qb: 0.25, hb: 0.50, jhb: 0.50 };


    invoice?.items?.forEach(item => {
      totalBoxes += 1;
      totalBoxTypeValue += boxTypeValues[item.boxType] || 0;
      if (item.bunches && Array.isArray(item.bunches)) {
        item.bunches.forEach(bunch => {
          const bunchesCount = Number(bunch.bunchesPerBox) || 0;
          const stemsPerBunch = Number(bunch.stemsPerBunch) || 0;
          const price = invoice.type === 'purchase' ? (Number(bunch.purchasePrice) || 0) : (Number(bunch.salePrice) || 0);

          totalBunches += bunchesCount;
          const stemsInBunch = bunchesCount * stemsPerBunch;
          totalStems += stemsInBunch;
          totalFob += stemsInBunch * price;
        });
      }
    });

    const iva = isNational ? totalFob * 0.15 : 0;
    const totalConIva = totalFob + iva;

    return { totalBoxes, totalBunches, totalStems, totalFob, iva, totalConIva, totalBoxTypeValue };
  }, [invoice, isNational]);


  const handleDownloadExcel = () => {
    setIsGenerating(true);
    try {
      const ws_data: (string | number)[][] = [
        ["INVOICE"],
        [],
        ["DATE:", format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy'), "", "No.", invoice.invoiceNumber],
        ["AWB:", invoice.masterAWB],
        ["HAWB:", invoice.houseAWB],
        [],
        ["Name Client:", consignatario?.nombreConsignatario || customer?.name || ''],
        ["Agency:", carguera?.nombreCarguera || ''],
        ["Address:", consignatario?.direccion || customer?.address || ''],
        ["Country:", consignatario?.pais || pais?.nombre || ''],
        [],
        ["CAJAS", "TIPO", "MARCA", "PRODUCTO", "VARIEDAD", "LONG.", "TALLOS", "BUNCHES", "P. VENTA", "TOTAL"]
      ];

      invoice.items.forEach((item, itemIndex) => {
        (item.bunches || []).forEach((bunch, bunchIndex) => {
            const stemsPerBunch = bunch.stemsPerBunch || 0;
            const bunchesPerBox = bunch.bunchesPerBox || 0;
            const pricePerStem = invoice.type === 'purchase' ? bunch.purchasePrice : bunch.salePrice;

            const totalStemsForBunch = stemsPerBunch * bunchesPerBox;
            const totalPrice = totalStemsForBunch * pricePerStem;
            
            ws_data.push([
              bunchIndex === 0 ? item.boxNumber : '',
              bunchIndex === 0 ? item.boxType.toUpperCase() : '',
              invoice.reference || '',
              bunch.product,
              bunch.variety,
              bunch.length,
              totalStemsForBunch,
              bunchesPerBox,
              pricePerStem.toFixed(3),
              totalPrice.toFixed(2)
            ]);
        });
      });
      
      ws_data.push([]);
      ws_data.push(
        [totals.totalBoxes, totals.totalBoxTypeValue.toFixed(2), "TOTALES", "", "", "", totals.totalStems, totals.totalBunches, "", `$${totals.totalFob.toFixed(2)}`]
      );

      ws_data.push([]);
      ws_data.push(["", "", "", "", "", "", "", "", "SUBTOTAL", `$${totals.totalFob.toFixed(2)}`]);
      ws_data.push(["", "", "", "", "", "", "", "", "IVA 15%", `$${totals.iva.toFixed(2)}`]);
      ws_data.push(["", "", "", "", "", "", "", "", "TOTAL", `$${totals.totalConIva.toFixed(2)}`]);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      ws['!cols'] = [
        { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Invoice ${invoice.invoiceNumber}`);

      const fileName = `Factura-${invoice.invoiceNumber.trim()}.xlsx`;
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
