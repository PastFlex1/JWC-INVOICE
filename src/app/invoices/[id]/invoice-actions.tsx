'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import InvoiceDownloadButton from './invoice-download-button';
import { SendInvoiceDialog } from '../send-invoice-dialog';
import type { Invoice, Customer, Consignatario, Carguera, Pais, Financials } from '@/lib/types';
import { Send } from 'lucide-react';
import InvoiceDownloadExcelButton from './invoice-download-excel-button';
import { useTranslation } from '@/context/i18n-context';


type InvoiceActionsProps = {
  invoice: Invoice;
  customer: Customer | null;
  consignatario: Consignatario | null;
  carguera: Carguera | null;
  pais: Pais | null;
  financials: Financials;
};

export function InvoiceActions({ invoice, customer, consignatario, carguera, pais, financials }: InvoiceActionsProps) {
  const router = useRouter();
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-2 no-print">
        <Button variant="outline" onClick={() => router.back()}>
          {t('invoices.actions.back')}
        </Button>
        <InvoiceDownloadButton
          invoice={invoice}
        />
        <InvoiceDownloadExcelButton 
            invoice={invoice}
            customer={customer}
            consignatario={consignatario}
            carguera={carguera}
            pais={pais}
            financials={financials}
        />
        <Button onClick={() => setIsSendDialogOpen(true)} variant="outline">
          <Send className="mr-2 h-4 w-4" />
          {t('invoices.actions.sendByEmail')}
        </Button>
      </div>

      <SendInvoiceDialog
        isOpen={isSendDialogOpen}
        onClose={() => setIsSendDialogOpen(false)}
        invoice={invoice}
        customer={customer}
      />
    </>
  );
}
