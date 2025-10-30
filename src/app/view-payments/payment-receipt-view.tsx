'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import type { AggregatedPayment } from './view-payments-client';

type PaymentReceiptViewProps = {
  payment: AggregatedPayment;
};

export function PaymentReceiptView({ payment }: PaymentReceiptViewProps) {
  return (
    <Card className="p-6 bg-white text-black shadow-lg border print:shadow-none print:border-0" id={`payment-receipt-${payment.id}`}>
      <CardContent className="p-0 text-sm leading-tight">
        <header className="flex justify-between items-start mb-6">
          <div className="w-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="JCW Flowers Logo" width={200} height={60} className="mb-4" />
            <div className="text-xs">
              <p>El Quinche, Pasaje F y Calle Quito</p>
              <p>Quito</p>
              <p>Ecuador</p>
              <p><strong>E-mail:</strong> jcwf@outlook.es</p>
              <p><strong>Phone:</strong> 096 744 1343</p>
            </div>
          </div>
          <div className="w-1/2 flex flex-col items-end">
            <h1 className="text-xl font-bold mb-4 tracking-wider">RECIBO DE PAGO</h1>
            <div className="w-[280px] text-xs mt-4">
              <div className="flex border border-gray-300">
                <div className="w-1/2 p-1 bg-gray-100 font-bold">Fecha de Pago:</div>
                <div className="w-1/2 p-1 text-center">{format(parseISO(payment.paymentDate), 'dd/MM/yyyy')}</div>
              </div>
              <div className="flex border-l border-r border-b border-gray-300">
                <div className="w-1/2 p-1 bg-gray-100 font-bold">Monto Total:</div>
                <div className="w-1/2 p-1 text-right font-bold">${payment.amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="border border-black p-2 mb-4 text-xs">
          <div className="grid grid-cols-[auto,1fr] gap-x-2">
            <strong>Pagado por:</strong>
            <span className="font-bold">{payment.entityName.toUpperCase()}</span>
            <strong>Método de Pago:</strong>
            <span>{payment.paymentMethod}</span>
            {payment.reference && (
              <>
                <strong>Referencia/Banco:</strong>
                <span>{payment.reference}</span>
              </>
            )}
             {payment.notes && (
              <>
                <strong>Notas:</strong>
                <span>{payment.notes}</span>
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="font-bold mb-2">Desglose de Pago:</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Consignatario</TableHead>
                <TableHead className="text-right">Monto Aplicado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.details.map((detail, index) => (
                <TableRow key={index}>
                  <TableCell>{detail.invoiceNumber}</TableCell>
                  <TableCell>{detail.customerName}</TableCell>
                  <TableCell>{detail.consigneeName}</TableCell>
                  <TableCell className="text-right">${detail.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

      </CardContent>
    </Card>
  );
}
