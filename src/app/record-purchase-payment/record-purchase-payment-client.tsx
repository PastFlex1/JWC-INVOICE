'use client';

import { useAppData } from '@/context/app-data-context';
import { PaymentForm } from '@/app/payments/payment-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Payment } from '@/lib/types';
import { addBulkPayment } from '@/services/payments';

export function RecordPurchasePaymentClient() {
  const { customers, fincas, invoices, creditNotes, debitNotes, payments, consignatarios, refreshData } = useAppData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddBulkPayment = async (
    paymentDetails: Omit<Payment, 'id' | 'invoiceId' | 'amount'>,
    selectedInvoices: { invoiceId: string; balance: number; type: 'sale' | 'purchase' | 'both', flightDate: string, amountToPay: number }[]
  ) => {
    setIsSubmitting(true);
    try {
      await addBulkPayment(paymentDetails, selectedInvoices);
      toast({
        title: "Éxito",
        description: "El pago de la compra ha sido registrado y la(s) factura(s) actualizada(s).",
      });
      await refreshData();
      return true; // Indicate success
    } catch (error) {
      console.error("Error registering purchase payment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago de la compra.",
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
          <h2 className="text-3xl font-bold tracking-tight font-headline">Registrar Pago de Compra</h2>
          <p className="text-muted-foreground">Seleccione un proveedor y las facturas de compra a las que desea aplicar un pago.</p>
      </div>

      <div className="grid grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Pago de Compra</CardTitle>
            <CardDescription>Complete el formulario para registrar un pago a un proveedor.</CardDescription>
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
