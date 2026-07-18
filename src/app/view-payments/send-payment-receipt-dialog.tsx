
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
<<<<<<< HEAD
=======
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
>>>>>>> origin/main
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
import { useTranslation } from '@/context/i18n-context';

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
  const { t } = useTranslation();
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
      
      const receiptElementId = `payment-receipt-${payment.id}-modal`;
      const receiptElement = document.getElementById(receiptElementId);

      if (!receiptElement) {
        setError("Could not find receipt content to generate PDF.");
        return;
      }
      
      try {
<<<<<<< HEAD
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
        const canvas = await html2canvas(receiptElement, {
          scale: 1.5,
=======
        const canvas = await html2canvas(receiptElement, {
          scale: 3,
>>>>>>> origin/main
          useCORS: true,
          logging: false,
          width: receiptElement.scrollWidth,
          height: receiptElement.scrollHeight,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight,
        });

<<<<<<< HEAD
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
=======
        const imgData = canvas.toDataURL('image/png');
>>>>>>> origin/main
        const pdf = new jsPDF('p', 'pt', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const ratio = pdfWidth / canvasWidth;
        const imgHeight = canvasHeight * ratio;

        const x = (pdfWidth - (canvasWidth * ratio)) / 2;

        let position = 0;
        let remainingHeight = imgHeight;

<<<<<<< HEAD
        pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
=======
        pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
>>>>>>> origin/main
        remainingHeight -= pdfHeight;

        while (remainingHeight > 0) {
            position -= pdfHeight;
            pdf.addPage();
<<<<<<< HEAD
            pdf.addImage(imgData, 'JPEG', x, position, canvasWidth * ratio, imgHeight);
=======
            pdf.addImage(imgData, 'PNG', x, position, canvasWidth * ratio, imgHeight);
>>>>>>> origin/main
            remainingHeight -= pdfHeight;
        }

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
        <DialogHeader>
            <DialogTitle>Enviar Recibo de Pago por Correo</DialogTitle>
            <DialogDescription>
            Revise el recibo y confirme los detalles del envío para {payment.entityName}.
            </DialogDescription>
        </DialogHeader>

        <div className="h-[60vh] overflow-y-auto border rounded-md p-4 bg-gray-50/50 mt-4">
            <div id={`payment-receipt-${payment.id}-modal`}>
            <PaymentReceiptView payment={payment} t={t} />
            </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {error && (
                <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Enviar a</FormLabel>
                    <FormControl>
                    <Input {...field} placeholder="email1@ejemplo.com, email2@ejemplo.com" />
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
                {isPending ? 'Enviando...' : 'Confirmar y Enviar'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
