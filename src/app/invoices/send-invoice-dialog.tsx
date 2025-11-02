
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import type { Invoice, Customer } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

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


type SendInvoiceDialogProps = {
  invoice: Invoice | null;
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SendInvoiceDialog({ invoice, customer, isOpen, onClose }: SendInvoiceDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (customer && isOpen) {
      form.reset({
        to: customer.email || '',
        body: '',
      });
      setError(null);
    }
  }, [customer, isOpen, form]);
  
  if (!invoice || !customer) {
    return null;
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setError(null);
    startTransition(async () => {
      const subject = `INVOICE ${invoice.invoiceNumber} JWC FLOWERS`;
      const defaultBody = `Dear Client,\nAttached you will find your invoice\nThanks for prefer us product`;
      const body = values.body ? `${defaultBody}\n\n${values.body}` : defaultBody;
      
      const invoiceElement = document.getElementById('invoice-to-print');
      if (!invoiceElement) {
        setError("Could not find invoice content to generate PDF.");
        return;
      }
      
      try {
        const canvas = await html2canvas(invoiceElement, {
          scale: 2,
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
        const finalImgWidth = imgWidth * ratio;
        const finalImgHeight = imgHeight * ratio;
        const xPos = (pdfWidth - finalImgWidth) / 2;

        let position = 0;
        let remainingHeight = finalImgHeight;
        
        pdf.addImage(imgData, 'PNG', xPos, position, finalImgWidth, finalImgHeight);
        remainingHeight -= pdfHeight;

        while (remainingHeight > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', xPos, position, finalImgWidth, finalImgHeight);
            remainingHeight -= pdfHeight;
        }

        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: values.to,
                subject,
                body,
                attachments: [{
                    filename: `Factura-${invoice.invoiceNumber.trim()}.pdf`,
                    content: pdfBase64,
                }],
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email.');
        }
        
        toast({
          title: t('sendInvoiceDialog.successTitle'),
          description: t('sendInvoiceDialog.successDescription', { invoiceNumber: invoice.invoiceNumber, email: values.to }),
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
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Enviar Factura por Correo</DialogTitle>
              <DialogDescription>
                La factura {invoice.invoiceNumber} será enviada a {customer.name}. Puede añadir múltiples correos separados por comas.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="py-6 space-y-4">
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
            </div>
            
            <DialogFooter>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
