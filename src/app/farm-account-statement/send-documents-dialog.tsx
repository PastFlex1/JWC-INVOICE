
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import type { Finca, Invoice } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

const emailListSchema = z.string().refine(
    (value) => {
      if (!value) return true; // Optional field
      const emails = value.split(',').map(email => email.trim()).filter(Boolean);
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    {
      message: 'Proporcione una lista válida de direcciones de correo electrónico separadas por comas.',
    }
);

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
  bcc: emailListSchema.optional(),
  body: z.string().optional(),
});

type SendDocumentsDialogProps = {
  finca: Finca | null;
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
};

async function generatePdfForElement(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
        const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            logging: false,
        });
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
        const imgWidth = canvasWidth * ratio;
        const imgHeight = canvasHeight * ratio;
        const x = (pdfWidth - imgWidth) / 2;
        let position = 0;

        pdf.addImage(canvas.toDataURL('image/jpeg', 0.75), 'JPEG', x, position, imgWidth, imgHeight);
        let remainingHeight = imgHeight - pdfHeight;
        
        while (remainingHeight > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.75), 'JPEG', x, position, imgWidth, imgHeight);
            remainingHeight -= pdfHeight;
        }

        return pdf.output('datauristring').split(',')[1];
    } catch (error) {
        console.error("Error generating PDF:", error);
        return null;
    }
}


export default function SendFarmDocumentsDialog({ finca, invoices, isOpen, onClose }: SendDocumentsDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });
  
  useEffect(() => {
    if (finca && isOpen) {
      form.reset({
        to: finca.email || '', 
        bcc: '',
        body: '',
      });
      setError(null);
    }
  }, [finca, isOpen, form]);
  
  if (!finca) {
    return null;
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSending(true);
    setError(null);

    const subject = `STATEMENT ${finca.name}`;
    const defaultBody = `Dear Client,\nAttached you will find your Statement Update\nThanks for prefer us product`;
    const body = values.body ? `${defaultBody}\n\n${values.body}` : defaultBody;
    
    try {
        const statementPdfBase64 = await generatePdfForElement('farm-statement-to-print');
        if (!statementPdfBase64) {
          throw new Error("Failed to generate the account statement PDF.");
        }

        const attachments = [{
            filename: `${t('farmAccountStatement.pdf.fileName')}-${finca.name.replace(/ /g, '_')}.pdf`,
            content: statementPdfBase64,
        }];

        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: values.to,
                bcc: values.bcc,
                subject: subject,
                body: body,
                attachments,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email.');
        }

        toast({
            title: t('sendInvoiceDialog.successTitle'),
            description: t('sendInvoiceDialog.successDescriptionGeneric', { email: values.to }),
        });
        onClose();
        
    } catch (e: any) {
        const errorMessage = e.message || 'An unknown error occurred.';
        setError(errorMessage);
        toast({
            title: t('sendInvoiceDialog.errorTitle'),
            description: errorMessage,
            variant: "destructive",
        });
    }


    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isSending ? onClose : () => {}}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('farmAccountStatement.sendDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('farmAccountStatement.sendDialog.description', { farmName: finca.name })}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>{t('common.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="py-6 space-y-4">
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sendInvoiceDialog.to')}</FormLabel>
                    <FormControl>
                      <Input placeholder="proveedor@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sendInvoiceDialog.bcc')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('sendInvoiceDialog.bccPlaceholder')} />
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
                    <FormLabel>{t('sendInvoiceDialog.body')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('sendInvoiceDialog.bodyPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSending ? t('sendInvoiceDialog.sending') : t('sendInvoiceDialog.send')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
