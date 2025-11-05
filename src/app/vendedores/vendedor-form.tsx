
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Vendedor } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(2, { message: "Name must be at least 2 characters." }),
  siglas: z.string(),
});

type VendedorFormData = Omit<Vendedor, 'id'> & { id?: string };

type VendedorFormProps = {
  onSubmit: (data: VendedorFormData) => void;
  onClose: () => void;
  initialData?: Vendedor | null;
  isSubmitting: boolean;
};

export function VendedorForm({ onSubmit, onClose, initialData, isSubmitting }: VendedorFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: initialData || {
      nombre: '',
      siglas: '',
    },
  });

  const { watch, setValue } = form;
  const nombre = watch('nombre');

  useEffect(() => {
    if (nombre) {
      const parts = nombre.trim().split(' ').filter(Boolean);
      let initials = '';
      if (parts.length > 1) {
        initials = (parts[0][0] || '') + (parts[1][0] || '');
      } else if (parts.length === 1 && parts[0].length > 1) {
        initials = parts[0].substring(0, 2);
      } else if (parts.length === 1) {
        initials = parts[0].substring(0, 1);
      }
      setValue('siglas', initials.toUpperCase());
    } else {
      setValue('siglas', '');
    }
  }, [nombre, setValue]);

  useEffect(() => {
    form.reset(initialData || {
      nombre: '',
      siglas: '',
    });
  }, [initialData, form]);

  function handleSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit = initialData ? { ...values, id: initialData.id } : values;
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Alex Palma" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="siglas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initials</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Seller')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
