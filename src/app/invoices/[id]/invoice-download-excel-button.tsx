
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import type { Invoice, Customer, Consignatario, Carguera, Pais, Financials, BunchItem } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';

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
  const { t } = useTranslation();

  const isNational = customer?.type === 'National';
  const boxTypeValues: { [key: string]: number } = { eb: 0.13, qb: 0.25, hb: 0.50, jhb: 0.50 };

  const totals = useMemo(() => {
    let totalBoxes = 0;
    let totalBunches = 0;
    let totalStems = 0;
    let totalFob = 0;
    let totalBoxTypeValue = 0;


    invoice?.items?.forEach(item => {
      const numBoxes = Number(item.numberOfBoxes) || 1;
      totalBoxes += numBoxes;
      totalBoxTypeValue += (boxTypeValues[item.boxType] || 0) * numBoxes;
      if (item.bunches && Array.isArray(item.bunches)) {
        item.bunches.forEach(bunch => {
          const productLower = (bunch.product || '').toLowerCase();
          const isGyp = productLower.includes('gyp');
          
          const bunchesCount = Number(bunch.bunchesPerBox) || 0;
          const stemsPerBunch = Number(bunch.stemsPerBunch) || 0;
          const price = invoice.type === 'purchase' ? (Number(bunch.purchasePrice) || 0) : (Number(bunch.salePrice) || 0);

          totalBunches += bunchesCount * numBoxes;
          const stemsInBunch = bunchesCount * stemsPerBunch;
          totalStems += stemsInBunch * numBoxes;
          
          if (isGyp) {
            totalFob += (bunchesCount * price) * numBoxes;
          } else {
            totalFob += (stemsInBunch * price) * numBoxes;
          }
        });
      }
    });

    const iva = isNational ? totalFob * 0.15 : 0;
    const totalConIva = totalFob + iva;

    return { totalBoxes, totalBunches, totalStems, totalFob, iva, totalConIva, totalBoxTypeValue };
  }, [invoice, isNational, boxTypeValues]);


  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    try {
      const { generateStyledExcel } = await import('@/lib/excel-generator');
      const items = invoice.items || [];
      let hasGyp = false;
      let hasOthers = false;
      
      items.forEach(item => {
        item.bunches?.forEach(bunch => {
          if ((bunch.product || '').toLowerCase().includes('gyp')) {
            hasGyp = true;
          } else {
            hasOthers = true;
          }
        });
      });

      let priceHeaderStr = t('invoices.view.table.price');
      if (hasGyp && !hasOthers) priceHeaderStr = t('invoices.view.table.priceBunch');
      else if (hasGyp && hasOthers) priceHeaderStr = t('invoices.view.table.priceUnit');

      const ws_data: (string | number)[][] = [
        [t('invoices.view.invoiceTitle')],
        [],
        [t('invoices.view.date'), format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy'), "", t('invoices.view.no'), invoice.invoiceNumber],
        [t('invoices.view.awb'), invoice.masterAWB],
        [t('invoices.view.hawb'), invoice.houseAWB],
        [],
        [t('invoices.view.nameClient'), consignatario?.nombreConsignatario || customer?.name || ''],
        [t('invoices.view.agency'), carguera?.nombreCarguera || ''],
        [t('invoices.view.clientAddress'), consignatario?.direccion || customer?.address || ''],
        [t('invoices.view.country'), consignatario?.pais || pais?.nombre || ''],
        [],
        [
          t('invoices.view.table.boxes'), 
          t('invoices.view.table.type'), 
          t('invoices.view.table.fullBox'), 
          t('invoices.view.table.brand'), 
          t('invoices.view.table.product'), 
          t('invoices.view.table.variety'), 
          t('invoices.view.table.length'), 
          t('invoices.view.table.stems'), 
          t('invoices.view.table.bunches'), 
          priceHeaderStr, 
          t('invoices.view.table.total')
        ]
      ];

      invoice.items.forEach((item, itemIndex) => {
        const itemBoxValue = boxTypeValues[item.boxType] || 0;
        const numBoxes = item.numberOfBoxes || 1;
        (item.bunches || []).forEach((bunch, bunchIndex) => {
            const productLower = (bunch.product || '').toLowerCase();
            const isGyp = productLower.includes('gyp');
            
            const stemsPerBunch = bunch.stemsPerBunch || 0;
            const bunchesPerBox = bunch.bunchesPerBox || 0;
            const price = invoice.type === 'purchase' ? bunch.purchasePrice : bunch.salePrice;

            const totalStemsForBunch = stemsPerBunch * bunchesPerBox * numBoxes;
            
            const totalPrice = isGyp 
                ? (bunchesPerBox * numBoxes * price)
                : (totalStemsForBunch * price);
            
            ws_data.push([
              bunchIndex === 0 ? numBoxes : '',
              bunchIndex === 0 ? item.boxType.toUpperCase() : '',
              bunchIndex === 0 ? (itemBoxValue * numBoxes).toFixed(2) : '',
              invoice.reference || '',
              bunch.product,
              bunch.variety,
              bunch.length,
              totalStemsForBunch,
              bunchesPerBox * numBoxes,
              price.toFixed(3),
              totalPrice
            ]);
        });
      });
      
      ws_data.push([]);
      ws_data.push(
        [totals.totalBoxes, "", totals.totalBoxTypeValue.toFixed(2), t('invoices.view.table.totals'), "", "", "", totals.totalStems, totals.totalBunches, "", totals.totalFob]
      );

      ws_data.push([]);
      ws_data.push(["", "", "", "", "", "", "", "", "", t('invoices.view.subtotal'), totals.totalFob]);
      ws_data.push(["", "", "", "", "", "", "", "", "", t('invoices.view.iva'), totals.iva]);
      ws_data.push(["", "", "", "", "", "", "", "", "", t('invoices.view.total'), totals.totalConIva]);

      const colWidths = [8, 8, 10, 15, 20, 20, 8, 8, 8, 10, 12];
      const fileName = `${t('invoices.toast.excelFileName')}-${invoice.invoiceNumber.trim()}.xlsx`;

      await generateStyledExcel({
        ws_data,
        fileName,
        sheetName: `Invoice ${invoice.invoiceNumber}`,
        colWidths,
        headerRowIndex: 11
      });
      
      toast({
        title: t('common.success'),
        description: t('common.downloadSuccess', { fileName }),
      });

    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: t('common.error'),
        description: t('common.excelError'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownloadExcel} disabled={isGenerating} variant="outline">
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {t('invoices.actions.downloadExcel')}
    </Button>
  );
}
