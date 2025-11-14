
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
import { Loader2 } from 'lucide-react';
import type { PaymentDetail } from './view-payments-client';
import { useTranslation } from '@/context/i18n-context';

type EditPaymentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  paymentDetail: PaymentDetail;
  onSave: (newAmount: number) => Promise<void>;
};

const formSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
});

export function EditPaymentDialog({ isOpen, onClose, paymentDetail, onSave }: EditPaymentDialogProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: paymentDetail.amount,
    },
  });

  useEffect(() => {
    form.reset({ amount: paymentDetail.amount });
  }, [paymentDetail, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    await onSave(values.amount);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isSaving ? onClose : () => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('viewPayments.editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('viewPayments.editDialog.description', { invoice: paymentDetail.invoiceNumber })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('viewPayments.editDialog.newAmount')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
