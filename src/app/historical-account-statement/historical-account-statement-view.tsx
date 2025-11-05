'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StatementData } from './historical-account-statement-client';
import { useTranslation } from '@/context/i18n-context';

type HistoricalAccountStatementViewProps = {
  data: StatementData;
};

export function HistoricalAccountStatementView({ data }: HistoricalAccountStatementViewProps) {
  const { t } = useTranslation();
  
  // No grouping by month for historical view
  const allInvoices = data.invoices;

  const allTimeTotals = allInvoices.reduce(
    (acc, inv) => {
      acc.total += inv.total;
      acc.creditsDebits += inv.credits - inv.debits;
      acc.payments += inv.payments;
      acc.balance += inv.balance;
      return acc;
    },
    { total: 0, creditsDebits: 0, payments: 0, balance: 0 }
  );

  return (
    <Card className="p-6 bg-white text-black shadow-lg border print:shadow-none print:border-0" id="historical-statement-to-print">
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
            <h1 className="text-xl font-bold mb-4 tracking-wider">{t('accountStatement.view.title', { customerName: data.customer.name.toUpperCase() })}</h1>
            <div className="w-[280px] text-xs mt-4">
              <div className="flex border border-gray-300 bg-gray-100 font-bold">
                <div className="w-2/3 p-1">{t('accountStatement.view.balanceTitle')}:</div>
                <div className="w-1/3 p-1 text-center">{format(parseISO(data.statementDate), 'dd/MM/yyyy')}</div>
              </div>
              <div className="flex border-l border-r border-b border-gray-300">
                <div className="w-2/3 p-1"></div>
                <div className="w-1/3 p-1 text-right font-bold">${data.totalOutstanding.toFixed(2)}</div>
              </div>
            </div>
             <div className="w-[280px] text-xs mt-2">
              <div className="flex border border-gray-300 bg-gray-100 font-bold">
                <div className="w-2/3 p-1">{t('accountStatement.view.urgentPayment')}:</div>
                <div className="w-1/3 p-1 text-center">{format(parseISO(data.statementDate), 'dd/MM/yyyy')}</div>
              </div>
              <div className="flex border-l border-r border-b border-gray-300">
                <div className="w-2/3 p-1"></div>
                <div className="w-1/3 p-1 text-right font-bold">${data.urgentPayment.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="border border-black p-2 mb-4 text-xs">
          <div className="grid grid-cols-[auto,1fr] gap-x-2">
            <strong>{t('accountStatement.view.billingCustomer')}:</strong>
            <span className="font-bold">{data.customer.name.toUpperCase()}</span>
            <strong>{t('accountStatement.view.address')}:</strong>
            <span>{data.customer.address}</span>
            <strong>{t('accountStatement.view.city')}:</strong>
            <span>{data.customer.estadoCiudad}, {data.customer.pais}</span>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-[100px,100px,1fr,100px,100px,100px,100px] font-bold text-center bg-gray-200 border-t border-l border-r border-black text-xs">
            <div className="p-1 border-r border-black">{t('accountStatement.view.date')}</div>
            <div className="p-1 border-r border-black">{t('accountStatement.view.invoiceNo')}</div>
            <div className="p-1 border-r border-black">{t('accountStatement.view.customer')}</div>
            <div className="p-1 border-r border-black">{t('accountStatement.view.charges')}</div>
            <div className="p-1 border-r border-black">{t('accountStatement.view.creditsDebits')}</div>
            <div className="p-1 border-r border-black">{t('accountStatement.view.payments')}</div>
            <div className="p-1">{t('accountStatement.view.balance')}</div>
          </div>
          <div className="border-l border-r border-b border-black text-xs">
            <div className="grid grid-cols-[100px,100px,1fr,100px,100px,100px,100px] bg-gray-100 font-bold">
              <div className="p-1 border-b border-black col-span-7">{t('historicalAccountStatement.fullHistory')}</div>
            </div>
            {allInvoices.map(invoice => (
                <div key={invoice.id} className="grid grid-cols-[100px,100px,1fr,100px,100px,100px,100px] border-b border-gray-300">
                <div className="p-1 text-center">{format(parseISO(invoice.farmDepartureDate), 'dd/MM/yyyy')}</div>
                <div className="p-1 text-center">{invoice.invoiceNumber}</div>
                <div className="p-1">{invoice.consigneeName}</div>
                <div className="p-1 text-right">${invoice.total.toFixed(2)}</div>
                <div className="p-1 text-right">${(invoice.credits - invoice.debits).toFixed(2)}</div>
                <div className="p-1 text-right">${invoice.payments.toFixed(2)}</div>
                <div className="p-1 text-right font-semibold">${invoice.balance.toFixed(2)}</div>
                </div>
            ))}
          </div>

           <div className="grid grid-cols-[100px,100px,1fr,100px,100px,100px,100px] font-bold text-xs bg-gray-200 border-b border-l border-r border-black">
              <div className="p-1 border-r border-black col-span-3 text-center">{t('accountStatement.view.totalPending')}</div>
              <div className="p-1 border-r border-black text-right">${allTimeTotals.total.toFixed(2)}</div>
              <div className="p-1 border-r border-black text-right">${allTimeTotals.creditsDebits.toFixed(2)}</div>
              <div className="p-1 border-r border-black text-right">${allTimeTotals.payments.toFixed(2)}</div>
              <div className="p-1 text-right">${data.totalOutstanding.toFixed(2)}</div>
            </div>
        </section>

        <footer className="mt-6 text-xs">
          <h4 className="font-bold text-center mb-2">{t('accountStatement.view.creditPolicyTitle')}</h4>
          <div className="border border-black p-2 space-y-1">
            <p>{t('accountStatement.view.policy1')}</p>
            <p>{t('accountStatement.view.policy2')}</p>
            <p>{t('accountStatement.view.policy3')}</p>
            <p>{t('accountStatement.view.policy4')}</p>
            <p><strong>{t('accountStatement.view.policyNoteTitle')}</strong>{t('accountStatement.view.policyNote')}</p>
          </div>
        </footer>
      </CardContent>
    </Card>
  );
}
