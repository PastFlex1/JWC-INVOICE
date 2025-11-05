
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Producto, Variedad } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

const formSchema = z.object({
  variedad: z.string().min(1, "Variedad es requerida."),
  nombre: z.string().min(1, "Nombre del producto es requerido."),
  nombreColor: z.string().min(1, "Nombre del color es requerido."),
  color: z.string().min(1, "Color es requerido."),
  tallosPorRamo: z.coerce.number().min(0, "Tallos debe ser un número positivo."),
});

type ProductoFormData = z.infer<typeof formSchema>;
type FormSubmitData = Omit<Producto, 'id'> & { id?: string };

type ProductoFormProps = {
  onSubmit: (data: FormSubmitData) => void;
  onClose: () => void;
  initialData?: Producto | null;
  isSubmitting: boolean;
  variedades: Variedad[];
};

export function ProductoForm({ onSubmit, onClose, initialData, isSubmitting, variedades }: ProductoFormProps) {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      variedad: initialData?.variedad || '',
      nombre: initialData?.nombre || '',
      nombreColor: initialData?.nombreColor || '',
      color: initialData?.color || '#000000',
      tallosPorRamo: initialData?.tallosPorRamo || 0,
    },
  });

  useEffect(() => {
    form.reset({
      variedad: initialData?.variedad || '',
      nombre: initialData?.nombre || '',
      nombreColor: initialData?.nombreColor || '',
      color: initialData?.color || '#000000',
      tallosPorRamo: initialData?.tallosPorRamo || 0,
    });
  }, [initialData, form]);

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: FormSubmitData = {
      ...values,
      barras: initialData?.barras || '',
      estado: initialData?.estado || 'Activo',
      precio: initialData?.precio || 0,
    };
    
    if (initialData?.id) {
      dataToSubmit.id = initialData.id;
    }

    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="variedad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productos.form.product')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('productos.form.productPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {variedades.map(v => (
                      <SelectItem key={v.id} value={v.nombre}>
                        {v.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productos.form.variety')}</FormLabel>
              <FormControl>
                <Input placeholder={t('productos.form.varietyPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('productos.form.colorPicker')}</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="p-1 h-10 w-14 block bg-white border border-gray-200 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700"
                    />
                    <Input
                        placeholder="#FF0000"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full"
                    />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="nombreColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productos.form.colorName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('productos.form.colorNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="tallosPorRamo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productos.form.stems')}</FormLabel>
              <FormControl>
                <Input type="number" step="1" placeholder="25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t('common.saving') : (initialData ? t('common.saveChanges') : t('productos.form.addButton'))}
            </Button>
        </div>
      </form>
    </Form>
  );
}
