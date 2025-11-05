'use client';

import { useAppData } from '@/context/app-data-context';
import { PaymentForm } from '@/app/payments/payment-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Payment } from '@/lib/types';
import { addBulkPayment } from '@/services/payments';
import { useTranslation } from '@/context/i18n-context';

export function RecordPurchasePaymentClient() {
  const { customers, fincas, invoices, creditNotes, debitNotes, payments, consignatarios, refreshData } = useAppData();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddBulkPayment = async (
    paymentDetails: Omit<Payment, 'id' | 'invoiceId' | 'amount'>,
    selectedInvoices: { invoiceId: string; balance: number; type: 'sale' | 'purchase' | 'both', flightDate: string, amountToPay: number }[]
  ) => {
    setIsSubmitting(true);
    try {
      await addBulkPayment(paymentDetails, selectedInvoices);
      toast({
        title: t('common.success'),
        description: t('payments.toast.successDescriptionPurchase'),
      });
      await refreshData();
      return true; // Indicate success
    } catch (error) {
      console.error("Error registering purchase payment:", error);
      toast({
        title: t('common.error'),
        description: t('payments.toast.errorDescriptionPurchase'),
        variant: "destructive",
      });
       return false; // Indicate failure
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">{t('payments.purchase.title')}</h2>
          <p className="text-muted-foreground">{t('payments.purchase.description')}</p>
      </div>

      <div className="grid grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>{t('payments.purchase.detailsTitle')}</CardTitle>
            <CardDescription>{t('payments.purchase.detailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm 
              customers={customers}
              fincas={fincas}
              invoices={invoices}
              creditNotes={creditNotes}
              debitNotes={debitNotes}
              payments={payments}
              consignatarios={consignatarios}
              onSubmit={handleAddBulkPayment}
              isSubmitting={isSubmitting}
              paymentType="purchase"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
