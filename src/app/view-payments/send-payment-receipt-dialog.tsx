'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import type { AggregatedPayment } from './view-payments-client';
import { PaymentReceiptView } from './payment-receipt-view';

const formSchema = z.object({
  to: z.string()
    .min(1, 'Se requiere al menos un correo electrónico.')
    .refine(
      (value) => {
        const emails = value.split(',').map(email => email.trim()).filter(Boolean);
        if (emails.length === 0) return false;
        return emails.every(email => z.string().email().safeParse(email).success);
      },
      {
        message: 'Proporcione una lista válida de direcciones de correo electrónico separadas por comas.',
      }
    ),
  body: z.string().optional(),
});

type SendPaymentReceiptDialogProps = {
  payment: AggregatedPayment | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SendPaymentReceiptDialog({ payment, isOpen, onClose }: SendPaymentReceiptDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (payment && isOpen) {
      form.reset({
        to: payment.entityEmail || '',
        body: '',
      });
      setError(null);
    }
  }, [payment, isOpen, form]);

  if (!payment) {
    return null;
  }
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setError(null);
    startTransition(async () => {
      const subject = `Recibo de Pago - ${payment.entityName}`;
      const defaultBody = `Dear Client,\nAttached you will find your payment receipt.\nThanks for prefer us product`;
      const body = values.body ? `${defaultBody}\n\n${values.body}` : defaultBody;
      
      const receiptElement = document.getElementById(`payment-receipt-${payment.id}-modal`);
      if (!receiptElement) {
        setError("Could not find receipt content to generate PDF.");
        return;
      }
      
      try {
        const canvas = await html2canvas(receiptElement, {
          scale: 3,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: values.to,
                subject,
                body,
                attachments: [{
                    filename: `Recibo-de-Pago-${payment.entityName.replace(/ /g, '_')}.pdf`,
                    content: pdfBase64,
                }],
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to send email.');
        
        toast({
          title: "Correo Enviado",
          description: `El recibo de pago ha sido enviado a ${values.to}.`,
        });
        onClose();

      } catch (e: any) {
         const errorMessage = e.message || 'An unknown error occurred.';
         setError(errorMessage);
         toast({
           title: "Error al Enviar",
           description: errorMessage,
           variant: "destructive",
         });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isPending ? onClose : () => {}}>
      <DialogContent className="sm:max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Enviar Recibo de Pago por Correo</DialogTitle>
              <DialogDescription>
                El recibo de pago para {payment.entityName} será enviado. Puede añadir múltiples correos separados por comas.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="my-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje Personalizado (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Escriba un mensaje para añadir al correo..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {isPending ? 'Enviando...' : 'Enviar Correo'}
                  </Button>
                </DialogFooter>
              </div>
              <div className="h-[60vh] overflow-y-auto border rounded-md">
                 <div id={`payment-receipt-${payment.id}-modal`}>
                    <PaymentReceiptView payment={payment} />
                 </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
