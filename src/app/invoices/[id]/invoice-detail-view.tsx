
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { InvoiceActions } from './invoice-actions';
import type { Invoice, Customer, Consignatario, Carguera, Pais, LineItem, BunchItem, Financials } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';

type InvoiceDetailViewProps = {
  invoice: Invoice;
  customer: Customer | null;
  consignatario: Consignatario | null;
  carguera: Carguera | null;
  pais: Pais | null;
  financials: Financials;
};

export function InvoiceDetailView({ invoice, customer, consignatario, carguera, pais, financials }: InvoiceDetailViewProps) {
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

  const priceHeader = useMemo(() => {
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

    if (hasGyp && !hasOthers) return t('invoices.view.table.priceBunch');
    if (hasGyp && hasOthers) return t('invoices.view.table.priceUnit');
    return t('invoices.view.table.price');
  }, [invoice.items, t]);


  const renderItemRow = (item: LineItem, index: number) => {
    const itemBoxValue = boxTypeValues[item.boxType] || 0;
    const numBoxes = item.numberOfBoxes || 1;

    return (
       <React.Fragment key={item.id || index}>
        {(item.bunches || []).map((bunch, bunchIndex) => {
            const productLower = (bunch.product || '').toLowerCase();
            const isGyp = productLower.includes('gyp');
            
            const stemsPerBunch = bunch.stemsPerBunch || 0;
            const bunchesPerBox = bunch.bunchesPerBox || 0;
            const pricePerStem = invoice.type === 'purchase' ? bunch.purchasePrice : bunch.salePrice;

            const totalStemsForBunch = stemsPerBunch * bunchesPerBox * numBoxes;
            
            // Custom calculation for Gypsophila
            const totalPrice = isGyp 
                ? (bunchesPerBox * numBoxes * pricePerStem)
                : (totalStemsForBunch * pricePerStem);
            
            return (
                 <div key={bunch.id || bunchIndex} className="contents text-[10px] leading-tight">
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchIndex === 0 ? numBoxes : ''}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchIndex === 0 ? item.boxType.toUpperCase() : ''}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchIndex === 0 ? (itemBoxValue * numBoxes).toFixed(2) : ''}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{invoice.reference}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{bunch.product}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{bunch.variety}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunch.length}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{totalStemsForBunch}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchesPerBox * numBoxes}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-right">{pricePerStem.toFixed(3)}</div>
                    <div className="border-b border-r border-l border-gray-400 p-1 text-right font-semibold">${totalPrice.toFixed(2)}</div>
                </div>
            )
        })}
       </React.Fragment>
    )
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end items-center no-print">
          <InvoiceActions
            invoice={invoice}
            customer={customer}
            consignatario={consignatario}
            carguera={carguera}
            pais={pais}
            financials={financials}
          />
        </div>
        
        <Card className="p-4 bg-white text-black shadow-lg border print:shadow-none print:border-0" id="invoice-to-print">
          <CardContent className="p-0 text-xs leading-tight">
            <header className="flex justify-between items-start mb-4">
                <div className="w-1/2">
                    <img src="/logo.png" alt="JCW Flowers Logo" width={180} height={54} className="mb-4" />
                    <div className="text-[10px] space-y-1 mt-6">
                        <p><strong>{t('invoices.view.email')}:</strong> jcwf@outlook.es</p>
                        <p><strong>{t('invoices.view.phone')}:</strong> +593 99 617 9767</p>
                        <p><strong>{t('invoices.view.address')}:</strong> Pasaje F y Calle Quito, EL QUINCHE - QUITO - ECUADOR</p>
                    </div>
                </div>
                <div className="w-[300px] flex flex-col items-end">
                    <h1 className="text-3xl font-bold mb-4 tracking-wider">{t('invoices.view.invoiceTitle')}</h1>
                    <div className="w-full text-[10px] border border-gray-400">
                        <div className="flex">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">{t('invoices.view.date')}:</div>
                            <div className="w-2/3 p-1 text-center">{format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy')}</div>
                        </div>
                        <div className="flex border-t border-gray-400">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">{t('invoices.view.no')}.</div>
                            <div className="w-2/3 p-1 text-center font-bold text-base">{invoice.invoiceNumber}</div>
                        </div>
                    </div>
                     <div className="w-full text-[10px] mt-1 border border-gray-400">
                         <div className="flex">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">{t('invoices.view.awb')}:</div>
                            <div className="w-2/3 p-1 text-center">{invoice.masterAWB}</div>
                        </div>
                        <div className="flex border-t border-gray-400">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">{t('invoices.view.hawb')}:</div>
                            <div className="w-2/3 p-1 text-center">{invoice.houseAWB}</div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="border border-gray-400 p-2 mb-4 text-[10px]">
                <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
                    <strong>{t('invoices.view.nameClient')}:</strong> <span>{consignatario?.nombreConsignatario || customer?.name}</span>
                    <strong>{t('invoices.view.agency')}:</strong> <span>{carguera?.nombreCarguera}</span>
                    <strong>{t('invoices.view.clientAddress')}:</strong> <span>{consignatario?.direccion || customer?.address}</span>
                    <strong>{t('invoices.view.country')}:</strong> <span>{consignatario?.pais || pais?.nombre}</span>
                </div>
            </section>

            <section>
                <div className="grid grid-cols-[30px,40px,55px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px] font-bold text-center bg-gray-100 border-t border-l border-r border-gray-400 text-[9px] leading-tight">
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.boxes')}</div>
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.type')}</div>
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.fullBox')}</div>
                    <div className="p-1 border-r border-gray-400 text-left">{t('invoices.view.table.brand')}</div>
                    <div className="p-1 border-r border-gray-400 text-left">{t('invoices.view.table.product')}</div>
                    <div className="p-1 border-r border-gray-400 text-left">{t('invoices.view.table.variety')}</div>
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.length')}</div>
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.stems')}</div>
                    <div className="p-1 border-r border-gray-400">{t('invoices.view.table.bunches')}</div>
                    <div className="p-1 border-r border-gray-400">{priceHeader}</div>
                    <div className="p-1">{t('invoices.view.table.total')}</div>
                </div>
                
                <div className="border-l border-r border-b border-gray-400 grid grid-cols-[30px,40px,55px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px]">
                    {invoice.items.map((item, index) => renderItemRow(item, index))}
                </div>
                
                 <div className="grid grid-cols-[30px,40px,55px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px] font-bold text-center bg-gray-100 border-l border-r border-b border-gray-400 text-xs">
                    <div className="p-1 border-r border-gray-400 text-center">{totals.totalBoxes}</div>
                    <div className="p-1 border-r border-gray-400 col-span-2 text-center">{totals.totalBoxTypeValue.toFixed(2)}</div>
                    <div className="p-1 border-r border-gray-400 col-span-4 text-center">{t('invoices.view.table.totals')}</div>
                    <div className="p-1 border-r border-gray-400">{totals.totalStems}</div>
                    <div className="p-1 border-r border-gray-400">{totals.totalBunches}</div>
                    <div className="p-1 border-r border-gray-400"></div>
                    <div className="p-1 font-bold">${totals.totalFob.toFixed(2)}</div>
                </div>
            </section>

            <footer className="mt-4 flex justify-between items-start">
                <p className="text-[8px] max-w-[450px]">
                    {t('invoices.view.footerNote')}
                </p>
                <div className="text-sm space-y-px w-56">
                    <div className="flex border border-gray-400">
                        <div className="p-1 font-bold w-1/2 border-r border-gray-400 text-xs">{t('invoices.view.subtotal')}</div>
                        <div className="p-1 text-right w-1/2 font-bold">${totals.totalFob.toFixed(2)}</div>
                    </div>
                    <div className="flex border-b border-l border-r border-gray-400">
                        <div className="p-1 w-1/2 border-r border-gray-400 text-xs">{t('invoices.view.iva')}</div>
                        <div className="p-1 text-right w-1/2">${totals.iva.toFixed(2)}</div>
                    </div>
                    <div className="flex border border-gray-400 bg-gray-100">
                        <div className="p-1 font-bold w-1/2 border-r border-gray-400 text-xs">{t('invoices.view.total')}</div>
                        <div className="p-1 text-right w-1/2 font-bold text-red-600">${totals.totalConIva.toFixed(2)}</div>
                    </div>
                </div>
            </footer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
