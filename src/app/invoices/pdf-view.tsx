

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import type { Invoice, Customer, Consignatario, Carguera, Pais, LineItem, BunchItem } from '@/lib/types';

type InvoicePdfViewProps = {
  invoice: Invoice;
  customer: Customer | null;
  consignatario: Consignatario | null;
  carguera: Carguera | null;
  pais: Pais | null;
};

// This is a server-safe component for PDF rendering. No hooks allowed.
export function InvoicePdfView({ invoice, customer, consignatario, carguera, pais }: InvoicePdfViewProps) {
  
  const isNational = customer?.type === 'National';

  const calculateTotals = () => {
    let totalBoxes = invoice?.items?.length || 0;
    let totalBunches = 0;
    let totalStems = 0;
    let totalFob = 0;

    invoice?.items?.forEach(item => {
      if (item.bunches && Array.isArray(item.bunches)) {
        item.bunches.forEach(bunch => {
          const bunchesCount = Number(bunch.bunchesPerBox) || 0;
          const stemsPerBunch = Number(bunch.stemsPerBunch) || 0;
          const salePrice = Number(bunch.salePrice) || 0;

          totalBunches += bunchesCount;
          const stemsInBunch = bunchesCount * stemsPerBunch;
          totalStems += stemsInBunch;
          totalFob += stemsInBunch * salePrice;
        });
      }
    });

    if (isNational) {
        const iva = totalFob * 0.15;
        const totalConIva = totalFob + iva;
        return { totalBoxes, totalBunches, totalStems, totalFob, iva, totalConIva };
    }

    return { totalBoxes, totalBunches, totalStems, totalFob };
  };

  const totals = calculateTotals();

  const renderItemRow = (item: LineItem, index: number) => {
    return (
       <React.Fragment key={item.id || index}>
        {(item.bunches || []).map((bunch, bunchIndex) => {
            const totalStemsForBunch = bunch.stemsPerBunch * bunch.bunchesPerBox;
            const totalPrice = totalStemsForBunch * bunch.salePrice;
            return (
                 <div key={bunch.id || bunchIndex} className="contents text-[10px] leading-tight">
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchIndex === 0 ? item.numberOfBoxes : ''}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunchIndex === 0 ? item.boxType.toUpperCase() : ''}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{invoice.reference}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{bunch.product}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-left">{bunch.variety}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunch.length}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{totalStemsForBunch}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-center">{bunch.bunchesPerBox}</div>
                    <div className="border-b border-l border-gray-400 p-1 text-right">{bunch.salePrice.toFixed(3)}</div>
                    <div className="border-b border-r border-l border-gray-400 p-1 text-right font-semibold">${totalPrice.toFixed(2)}</div>
                </div>
            )
        })}
       </React.Fragment>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
        <Card className="p-4 bg-white text-black shadow-lg border print:shadow-none print:border-0" id="invoice-to-print">
          <CardContent className="p-0 text-xs leading-tight">
            {/* Header Section */}
            <header className="flex justify-between items-start mb-4">
                <div className="w-1/2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="JCW Flowers Logo" width={180} height={54} className="mb-4" />
                    <div className="text-[10px] space-y-1 mt-6">
                        <p><strong>E-MAIL:</strong> jcwf@outlook.es</p>
                        <p><strong>PHONE:</strong> +593 096 744 1343</p>
                        <p><strong>ADDRESS:</strong> Pasaje F y Calle Quito, EL QUINCHE - QUITO - ECUADOR</p>
                    </div>
                </div>
                <div className="w-[300px] flex flex-col items-end">
                    <h1 className="text-3xl font-bold mb-4 tracking-wider">INVOICE</h1>
                    <div className="w-full text-[10px] border border-gray-400">
                        <div className="flex">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">DATE:</div>
                            <div className="w-2/3 p-1 text-center">{format(parseISO(invoice.farmDepartureDate), 'MM/dd/yyyy')}</div>
                        </div>
                        <div className="flex border-t border-gray-400">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">No.</div>
                            <div className="w-2/3 p-1 text-center font-bold text-base">{invoice.invoiceNumber}</div>
                        </div>
                    </div>
                     <div className="w-full text-[10px] mt-1 border border-gray-400">
                         <div className="flex">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">AWB:</div>
                            <div className="w-2/3 p-1 text-center">{invoice.masterAWB}</div>
                        </div>
                        <div className="flex border-t border-gray-400">
                            <div className="w-1/3 border-r border-gray-400 p-1 font-bold">HAWB:</div>
                            <div className="w-2/3 p-1 text-center">{invoice.houseAWB}</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Client Info Section */}
            <section className="border border-gray-400 p-2 mb-4 text-[10px]">
                <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
                    <strong>Name Client:</strong> <span>{consignatario?.nombreConsignatario || customer?.name}</span>
                    <strong>Agency:</strong> <span>{carguera?.nombreCarguera}</span>
                    <strong>Address:</strong> <span>{consignatario?.direccion || customer?.address}</span>
                    <strong>Country:</strong> <span>{consignatario?.pais || pais?.nombre}</span>
                </div>
            </section>

            {/* Items Table */}
            <section>
                <div className="grid grid-cols-[30px,40px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px] font-bold text-center bg-gray-100 border-t border-l border-r border-gray-400 text-[9px] leading-tight">
                    <div className="p-1 border-r border-gray-400">CAJAS</div>
                    <div className="p-1 border-r border-gray-400">TIPO</div>
                    <div className="p-1 border-r border-gray-400 text-left">MARCA</div>
                    <div className="p-1 border-r border-gray-400 text-left">PRODUCTO</div>
                    <div className="p-1 border-r border-gray-400 text-left">VARIEDAD</div>
                    <div className="p-1 border-r border-gray-400">LONG.</div>
                    <div className="p-1 border-r border-gray-400">TALLOS</div>
                    <div className="p-1 border-r border-gray-400">BUNCHES</div>
                    <div className="p-1 border-r border-gray-400">P. VENTA</div>
                    <div className="p-1">TOTAL</div>
                </div>
                
                <div className="border-l border-r border-b border-gray-400 grid grid-cols-[30px,40px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px]">
                    {invoice.items.map((item, index) => renderItemRow(item, index))}
                </div>
                
                 <div className="grid grid-cols-[30px,40px,0.8fr,1.5fr,1fr,45px,45px,55px,55px,65px] font-bold text-center bg-gray-100 border-l border-r border-b border-gray-400 text-xs">
                    <div className="p-1 border-r border-gray-400 text-center">{totals.totalBoxes}</div>
                    <div className="p-1 border-r border-gray-400 col-span-5 text-center">TOTALES</div>
                    <div className="p-1 border-r border-gray-400">{totals.totalStems}</div>
                    <div className="p-1 border-r border-gray-400">{totals.totalBunches}</div>
                    <div className="p-1 border-r border-gray-400"></div> {/* unit price */}
                    <div className="p-1 font-bold">${totals.totalFob.toFixed(2)}</div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-4 flex justify-between items-end">
                <p className="text-[8px] max-w-[450px]">
                    All prices are FOB Quito. Please remember that you have 10 days after the date on the invoice to
                    make a claim and that we do not accept credits for freight or handling charges in any case.
                </p>
                 <div className="text-sm space-y-px w-56">
                    {isNational ? (
                         <>
                            <div className="flex border border-gray-400">
                                <div className="p-1 font-bold w-1/2 border-r border-gray-400 text-xs">SUBTOTAL</div>
                                <div className="p-1 text-right w-1/2 font-bold">${totals.totalFob.toFixed(2)}</div>
                            </div>
                            <div className="flex border-b border-l border-r border-gray-400">
                                <div className="p-1 w-1/2 border-r border-gray-400 text-xs">IVA 15%</div>
                                <div className="p-1 text-right w-1/2">${('iva' in totals && totals.iva) ? totals.iva.toFixed(2) : '0.00'}</div>
                            </div>
                            <div className="flex border border-gray-400 bg-gray-100">
                                <div className="p-1 font-bold w-1/2 border-r border-gray-400 text-xs">TOTAL</div>
                                <div className="p-1 text-right w-1/2 font-bold">${('totalConIva' in totals && totals.totalConIva) ? totals.totalConIva.toFixed(2) : '0.00'}</div>
                            </div>
                        </>
                    ) : (
                         <div className="flex border border-gray-400 w-56">
                            <div className="p-1 font-bold w-1/2 border-r border-gray-400 text-xs">TOTAL FOB</div>
                            <div className="p-1 text-right w-1/2 font-bold">${totals.totalFob.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            </footer>
          </CardContent>
        </Card>
    </div>
  );
}
