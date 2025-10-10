
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
import type { Finca } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
});

type SendDocumentsDialogProps = {
  finca: Finca | null;
  isOpen: boolean;
  onClose: () => void;
};

async function generatePdfForElement(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
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

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, position, imgWidth, imgHeight);
        let remainingHeight = imgHeight - pdfHeight;
        
        while (remainingHeight > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, position, imgWidth, imgHeight);
            remainingHeight -= pdfHeight;
        }

        return pdf.output('datauristring').split(',')[1];
    } catch (error) {
        console.error("Error generating PDF:", error);
        return null;
    }
}


export default function HistoricalSendFarmDocumentsDialog({ finca, isOpen, onClose }: SendDocumentsDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });
  
  useEffect(() => {
    if (finca && isOpen) {
      form.reset({
        to: finca.email || '', 
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

    const subject = `Estado de Cuenta Histórico para ${finca.name}`;
    const body = `Dear Client,\nAttached you will find your Statement Update\nThanks for prefer us product`;
    
    try {
        const statementPdfBase64 = await generatePdfForElement('historical-farm-statement-to-print');
        if (!statementPdfBase64) {
          throw new Error("Failed to generate the account statement PDF.");
        }

        const attachments = [{
            filename: `Estado-de-Cuenta-Historico-Finca-${finca.name.replace(/ /g, '_')}.pdf`,
            content: statementPdfBase64,
        }];

        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: values.to,
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
            title: "Correo Enviado",
            description: `Se han enviado los documentos a ${values.to}.`,
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


    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isSending ? onClose : () => {}}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Enviar Estado de Cuenta Histórico de Finca</DialogTitle>
              <DialogDescription>
                Se enviará el estado de cuenta por correo para {finca.name}. Puede añadir múltiples correos separados por comas.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="py-6">
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para</FormLabel>
                    <FormControl>
                      <Input placeholder="proveedor@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSending ? 'Enviando...' : `Enviar`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
