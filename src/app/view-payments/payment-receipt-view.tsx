'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import type { AggregatedPayment, PaymentDetail } from './view-payments-client';
import { useTranslation } from '@/context/i18n-context';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

type PaymentReceiptViewProps = {
  payment: AggregatedPayment;
  t?: (key: string, replacements?: Record<string, string | number>) => string;
  onEditPayment?: (paymentDetail: PaymentDetail) => void;
  onDeletePayment?: (paymentDetail: PaymentDetail) => void;
};

export function PaymentReceiptView({ payment, t: tProp, onEditPayment, onDeletePayment }: PaymentReceiptViewProps) {
  const { t: tHook } = useTranslation();
  const t = tProp || tHook;
  const isActionable = !!(onEditPayment && onDeletePayment);

  const totalPaid = payment.amount - (payment.bankFee || 0);
  const totalApplied = payment.details.reduce((sum, detail) => sum + detail.amount, 0);

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
              <p><strong>Phone:</strong> +593 99 617 9767</p>
            </div>
          </div>
          <div className="w-1/2 flex flex-col items-end">
            <h1 className="text-xl font-bold mb-4 tracking-wider">{t('viewPayments.receipt.title')}</h1>
            <div className="w-[280px] text-xs mt-4">
              <div className="flex border border-gray-300">
                <div className="w-1/2 p-1 bg-gray-100 font-bold">{t('viewPayments.receipt.paymentDate')}:</div>
                <div className="w-1/2 p-1 text-center">{format(parseISO(payment.paymentDate), 'dd/MM/yyyy')}</div>
              </div>
              <div className="flex border-l border-r border-b border-gray-300">
                <div className="w-1/2 p-1 bg-gray-100 font-bold">{t('viewPayments.receipt.totalAmount')}:</div>
                <div className="w-1/2 p-1 text-right font-bold">${payment.amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="border border-black p-2 mb-4 text-xs">
          <div className="grid grid-cols-[auto,1fr] gap-x-2">
            <strong>{t('viewPayments.receipt.paidBy')}:</strong>
            <span className="font-bold">{payment.entityName.toUpperCase()}</span>
            <strong>{t('viewPayments.receipt.paymentMethod')}:</strong>
            <span>{payment.paymentMethod}</span>
            {payment.reference && (
              <>
                <strong>{t('viewPayments.receipt.reference')}:</strong>
                <span>{payment.reference}</span>
              </>
            )}
             {payment.notes && (
              <>
                <strong>{t('viewPayments.receipt.notes')}:</strong>
                <span>{payment.notes}</span>
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="font-bold mb-2">{t('viewPayments.receipt.breakdown')}:</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('viewPayments.receipt.invoiceNo')}</TableHead>
                <TableHead>{t('viewPayments.receipt.customer')}</TableHead>
                <TableHead>{t('viewPayments.receipt.consignee')}</TableHead>
                <TableHead className="text-right">{t('viewPayments.receipt.amountApplied')}</TableHead>
                {isActionable && <TableHead className="text-right">{t('common.actions.title')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.details.map((detail) => (
                <TableRow key={detail.paymentId}>
                  <TableCell>{detail.invoiceNumber}</TableCell>
                  <TableCell>{detail.customerName}</TableCell>
                  <TableCell>{detail.consigneeName}</TableCell>
                  <TableCell className="text-right">${detail.amount.toFixed(2)}</TableCell>
                  {isActionable && onEditPayment && onDeletePayment && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onEditPayment(detail)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeletePayment(detail)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={isActionable ? 3 : 2} className="text-right font-medium">{t('viewPayments.receipt.totalPaid')}</TableCell>
                    <TableCell className="text-right">${totalApplied.toFixed(2)}</TableCell>
                    {isActionable && <TableCell />}
                </TableRow>
                {(payment.bankFee || 0) > 0 && (
                    <TableRow>
                        <TableCell colSpan={isActionable ? 3 : 2} className="text-right font-medium">{t('payments.dialog.bankFee')}</TableCell>
                        <TableCell className="text-right">-${(payment.bankFee || 0).toFixed(2)}</TableCell>
                         {isActionable && <TableCell />}
                    </TableRow>
                )}
                <TableRow className="font-bold text-lg bg-muted/50">
                    <TableCell colSpan={isActionable ? 3 : 2} className="text-right">{t('payments.dialog.total')}</TableCell>
                    <TableCell className="text-right">${totalPaid.toFixed(2)}</TableCell>
                    {isActionable && <TableCell />}
                </TableRow>
            </TableFooter>
          </Table>
        </section>

      </CardContent>
    </Card>
  );
}
