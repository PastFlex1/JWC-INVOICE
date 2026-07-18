
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, toDate, parseISO, addDays } from 'date-fns';
import { CalendarIcon, Trash2, PlusCircle, Loader2, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/i18n-context';

import { addInvoice, updateInvoice } from '@/services/invoices';
<<<<<<< HEAD
import type { Invoice, BunchItem, LineItem, Producto, Consignatario } from '@/lib/types';
=======
import type { Invoice, BunchItem, LineItem } from '@/lib/types';
>>>>>>> origin/main
import { useAppData } from '@/context/app-data-context';
import { getInvoiceStatus } from '@/lib/due-date';

const SESSION_STORAGE_KEY = 'newInvoiceFormData';

const bunchItemSchema = z.object({
  id: z.string(),
  productoId: z.string().min(1, 'Product is required.'),
  product: z.string().min(1, 'Product name is required'),
  variety: z.string().min(1, 'Variety is required.'),
  color: z.string().min(1, 'Color is required.'),
  length: z.string().regex(/^\s*\d+\s*(-?\s*\d+\s*)?$/, 'La longitud debe ser un número o un rango (ej: 40-50)'),
  stemsPerBunch: z.coerce.number().positive('Must be > 0'),
  bunchesPerBox: z.coerce.number().min(0, 'Must be >= 0'),
  purchasePrice: z.coerce.number().min(0, 'Must be >= 0'),
  salePrice: z.coerce.number().min(0, 'Must be >= 0'),
});


const lineItemSchema = z.object({
  id: z.string(),
  numberOfBoxes: z.coerce.number().min(1, 'Must be > 0'),
  boxType: z.enum(['qb', 'eb', 'hb', 'jhb'], { required_error: 'Select a type.' }),
  numberOfBunches: z.coerce.number().min(0, '# Ramos must be >= 0'),
  bunches: z.array(bunchItemSchema).min(1, 'At least one bunch is required.'),
}).refine(data => {
    const totalBunchesInBox = data.bunches.reduce((acc, bunch) => acc + (Number(bunch.bunchesPerBox) || 0), 0);
    return totalBunchesInBox === (Number(data.numberOfBunches) || 0);
}, {
    message: "La suma de 'Ramos/Caja' debe ser igual al total de # Ramos.",
    path: ['numberOfBunches'],
});

const invoiceSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['sale', 'purchase', 'both'], { required_error: 'Debe seleccionar un tipo de factura.' }),
  invoiceNumber: z.string().min(1, 'Invoice number is required.'),
  farmDepartureDate: z.date({ required_error: 'Departure date is required.' }),
  flightDate: z.date({ required_error: 'Flight date is required.' }),
  sellerId: z.string().min(1, 'Select a seller.'),
  customerId: z.string().min(1, 'Select a customer.'),
  consignatarioId: z.string().optional(),
  farmId: z.string().min(1, 'Select a farm.'),
  carrierId: z.string().min(1, 'Select a carrier.'),
  countryId: z.string().min(1, 'Select a country.'),
  reference: z.string().optional(),
  masterAWB: z.string().min(1, 'Master AWB is required.'),
  houseAWB: z.string().min(1, 'House AWB is required.'),
  items: z.array(lineItemSchema).min(1, 'At least one item is required.'),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { customers, fincas, vendedores, cargueras, paises, consignatarios, productos, marcaciones, invoices, creditNotes, debitNotes, payments, refreshData, isLoading: isAppDataLoading } = useAppData();
  const { t } = useTranslation();

  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const idToLoad = editId || duplicateId;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
<<<<<<< HEAD
  const [filteredConsignatarios, setFilteredConsignatarios] = useState<Consignatario[]>([]);
=======
  const [filteredConsignatarios, setFilteredConsignatarios] = useState<typeof consignatarios>([]);
>>>>>>> origin/main
  const [filteredMarcaciones, setFilteredMarcaciones] = useState<typeof marcaciones>([]);
  const [itemToDelete, setItemToDelete] = useState<{ lineItemIndex: number; bunchIndex: number } | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onBlur',
    defaultValues: {
      items: [],
<<<<<<< HEAD
      consignatarioId: '',
      reference: '',
      carrierId: '',
    }
  });
  
=======
    }
  });
  
  // Effect to load existing invoice for editing/duplicating
>>>>>>> origin/main
  useEffect(() => {
    if (idToLoad && !isAppDataLoading) {
      const invoiceToLoad = invoices.find(inv => inv.id === idToLoad);
      if (invoiceToLoad) {
        const dataForForm: any = {
          ...invoiceToLoad,
<<<<<<< HEAD
          id: duplicateId ? undefined : invoiceToLoad.id,
          invoiceNumber: duplicateId ? '' : invoiceToLoad.invoiceNumber,
=======
          id: duplicateId ? undefined : invoiceToLoad.id, // clear ID if duplicating
          invoiceNumber: duplicateId ? '' : invoiceToLoad.invoiceNumber, // clear invoice number if duplicating
>>>>>>> origin/main
          farmDepartureDate: parseISO(invoiceToLoad.farmDepartureDate),
          flightDate: parseISO(invoiceToLoad.flightDate),
          consignatarioId: invoiceToLoad.consignatarioId || '',
          reference: invoiceToLoad.reference || '',
          items: invoiceToLoad.items.map(item => ({
            ...item,
            id: uuidv4(),
            bunches: item.bunches.map(bunch => ({
              ...bunch,
              id: uuidv4(),
<<<<<<< HEAD
              length: String(bunch.length),
=======
              length: String(bunch.length), // Ensure length is a string
>>>>>>> origin/main
            })),
          })),
        };
        delete dataForForm.saleStatus;
        delete dataForForm.purchaseStatus;
        form.reset(dataForForm);
<<<<<<< HEAD
=======
      } else {
        console.warn(`Invoice with id ${idToLoad} not found.`);
>>>>>>> origin/main
      }
    }
  }, [idToLoad, isAppDataLoading, invoices, form, duplicateId]);


<<<<<<< HEAD
=======
  // Effect for session storage, only for new invoices
>>>>>>> origin/main
  useEffect(() => {
    if (!idToLoad) {
        const savedData = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.farmDepartureDate) parsed.farmDepartureDate = parseISO(parsed.farmDepartureDate);
                if (parsed.flightDate) parsed.flightDate = parseISO(parsed.flightDate);
                form.reset(parsed);
            } catch (e) {
                console.error("Could not parse saved form data:", e);
<<<<<<< HEAD
=======
                form.reset({});
>>>>>>> origin/main
            }
        }
    }
    const subscription = form.watch((value) => {
      if (!idToLoad) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, idToLoad]);


  const farmDepartureDate = form.watch('farmDepartureDate');
  const watchedItems = form.watch('items');
  const referenceValue = form.watch('reference');

  useEffect(() => {
    if (farmDepartureDate && form.formState.dirtyFields.farmDepartureDate) {
      const nextDay = addDays(new Date(farmDepartureDate), 1);
      form.setValue('flightDate', nextDay, { shouldValidate: true });
    }
  }, [farmDepartureDate, form]);

  const { fields: lineItems, append: appendLineItem, remove: removeLineItem, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const totals = useMemo(() => {
    const boxTypeValues: { [key: string]: number } = { eb: 0.13, qb: 0.25, hb: 0.50, jhb: 0.50 };
    const currentItems = watchedItems || [];
    const result = currentItems.reduce((acc, item) => {
        const numBoxes = Number(item.numberOfBoxes) || 0;
        acc.totalBoxTypeValue += (boxTypeValues[item.boxType] || 0) * numBoxes;
        acc.totalBoxes += numBoxes;
        acc.totalBunches += (Number(item.numberOfBunches) || 0) * numBoxes;
        
        item.bunches.forEach(bunch => {
<<<<<<< HEAD
            const productLower = (bunch.product || '').toLowerCase();
            const isGyp = productLower.includes('gyp');
            
            const bunchesCount = Number(bunch.bunchesPerBox) || 0;
=======
            const bunchesPerBox = Number(bunch.bunchesPerBox) || 0;
>>>>>>> origin/main
            const stemsPerBunch = Number(bunch.stemsPerBunch) || 0;
            const purchasePrice = Number(bunch.purchasePrice) || 0;
            const salePrice = Number(bunch.salePrice) || 0;

            acc.totalStemsPerBunch += stemsPerBunch;
<<<<<<< HEAD
            acc.totalBunchesPerBox += bunchesCount;
            const totalStemsForBunch = stemsPerBunch * bunchesCount;
=======
            acc.totalBunchesPerBox += bunchesPerBox;
            const totalStemsForBunch = stemsPerBunch * bunchesPerBox;
>>>>>>> origin/main
            const totalStemsForLine = totalStemsForBunch * numBoxes;
            acc.totalStems += totalStemsForLine;

            acc.totalPurchasePrice += purchasePrice;
            acc.totalSalePrice += salePrice;
            acc.bunchCount += 1;

            if (purchasePrice > 0) {
                acc.totalDifference += ((salePrice - purchasePrice) / purchasePrice) * 100;
                acc.differenceCount += 1;
            } else if (salePrice > 0) {
                acc.totalDifference += Infinity;
                acc.differenceCount += 1;
            }

<<<<<<< HEAD
            if (isGyp) {
                acc.totalValue += (bunchesCount * numBoxes * salePrice);
            } else {
                acc.totalValue += totalStemsForLine * salePrice;
            }
=======
            acc.totalValue += totalStemsForLine * salePrice;
>>>>>>> origin/main
        });
        return acc;
    }, {
        totalBoxTypeValue: 0,
        totalBoxes: 0,
        totalBunches: 0,
        totalStemsPerBunch: 0,
        totalBunchesPerBox: 0,
        totalStems: 0,
        totalPurchasePrice: 0,
        totalSalePrice: 0,
        totalValue: 0,
        bunchCount: 0,
        totalDifference: 0,
        differenceCount: 0
    });

    const averagePurchasePrice = result.bunchCount > 0 ? result.totalPurchasePrice / result.bunchCount : 0;
    const averageSalePrice = result.bunchCount > 0 ? result.totalSalePrice / result.bunchCount : 0;
    const averageDifference = result.differenceCount > 0 
        ? (isFinite(result.totalDifference) ? result.totalDifference / result.differenceCount : Infinity)
        : 0;

    return {
        ...result,
        averagePurchasePrice,
        averageSalePrice,
        averageDifference,
    };
  }, [watchedItems]);

<<<<<<< HEAD
=======
  let rowCounter = 0;

>>>>>>> origin/main
  const uniqueProducts = useMemo(() => {
    const unique = new Map<string, { id: string; price: number; tallosPorRamo: number }>();
    productos.filter(p => p.estado === 'Activo').forEach(p => {
        if (!unique.has(p.variedad)) {
            unique.set(p.variedad, { id: p.id, price: p.precio, tallosPorRamo: p.tallosPorRamo });
        }
    });
    return Array.from(unique.entries()).map(([name, data]) => ({ name, ...data }));
  }, [productos]);
  

  const getVarietiesForProduct = useCallback((productName: string) => {
    if (!productName) return [];
    return [...new Set(productos.filter(p => p.variedad === productName && p.estado === 'Activo').map(p => p.nombre))];
  }, [productos]);
  
  const getColorsForVariety = useCallback((productName: string, varietyName: string) => {
    if (!productName || !varietyName) return [];
<<<<<<< HEAD
    const colorMap = new Map<string, { color: string; productoId: string; tallosPorRamo: number }>();
    
    productos
      .filter(p => p.variedad === productName && p.nombre === varietyName && p.estado === 'Activo')
      .forEach(p => {
        if (!colorMap.has(p.nombreColor)) {
          colorMap.set(p.nombreColor, {
            color: p.nombreColor,
            productoId: p.id,
            tallosPorRamo: p.tallosPorRamo
          });
        }
      });
      
    return Array.from(colorMap.values());
=======
    return productos.filter(p => p.variedad === productName && p.nombre === varietyName && p.estado === 'Activo').map(p => ({
        color: p.nombreColor,
        productoId: p.id,
        tallosPorRamo: p.tallosPorRamo
    }));
>>>>>>> origin/main
  }, [productos]);


  const selectedCustomerId = form.watch('customerId');
<<<<<<< HEAD
  const selectedConsignatarioId = form.watch('consignatarioId');

=======
>>>>>>> origin/main
  useEffect(() => {
    setCreditError(null);
    setCreditWarning(null);

    if (!selectedCustomerId) {
      setFilteredConsignatarios([]);
      setFilteredMarcaciones([]);
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (customer) {
      const country = paises.find((p) => p.nombre === customer.pais);
      if (country) {
        form.setValue('countryId', country.id, { shouldValidate: true });
      }
    }
    
    setFilteredConsignatarios(consignatarios.filter((c) => c.customerId === selectedCustomerId));
    setFilteredMarcaciones(marcaciones.filter((m) => m.cliente === selectedCustomerId));

<<<<<<< HEAD
=======
    // Only reset consignatario/reference if the customer was changed by the user,
    // not when the form is first loaded.
>>>>>>> origin/main
    if (form.formState.dirtyFields.customerId) {
      form.setValue('consignatarioId', '');
      form.setValue('reference', '');
    }

  }, [selectedCustomerId, customers, paises, consignatarios, marcaciones, form]);

<<<<<<< HEAD
  useEffect(() => {
    if (selectedConsignatarioId) {
      const consignatario = consignatarios.find(c => c.id === selectedConsignatarioId);
      if (consignatario && consignatario.carrierId) {
         form.setValue('carrierId', consignatario.carrierId, { shouldValidate: true });
      }
    }
  }, [selectedConsignatarioId, consignatarios, form]);

=======
>>>>>>> origin/main

  const handleAddLineItem = () => {
    appendLineItem({
        id: uuidv4(),
        numberOfBoxes: 1,
        boxType: 'hb',
        numberOfBunches: 1,
        bunches: [{
            id: uuidv4(),
            productoId: '',
            product: '',
            variety: '',
            color: '',
            length: '70',
            stemsPerBunch: 25,
            bunchesPerBox: 1,
            purchasePrice: 0,
            salePrice: 0,
        }]
    })
  }

  const handleAddBunch = (lineItemIndex: number) => {
    const lineItem = form.getValues(`items.${lineItemIndex}`);
    const newBunches = [...(lineItem.bunches || []), {
        id: uuidv4(),
        productoId: '',
        product: '',
        variety: '',
        color: '',
        length: '70',
        stemsPerBunch: 25,
        bunchesPerBox: 0,
        purchasePrice: 0,
        salePrice: 0,
    }];
    update(lineItemIndex, { ...lineItem, bunches: newBunches });
  };

  const confirmRemoveBunch = () => {
    if (itemToDelete) {
      const { lineItemIndex, bunchIndex } = itemToDelete;
      const lineItem = form.getValues(`items.${lineItemIndex}`);
      if (lineItem.bunches.length <= 1) {
        removeLineItem(lineItemIndex);
      } else {
        const newBunches = lineItem.bunches.filter((_, i) => i !== bunchIndex);
        update(lineItemIndex, { ...lineItem, bunches: newBunches });
      }
    }
    setItemToDelete(null);
  };

  const handleProductChange = (lineItemIndex: number, bunchIndex: number, productName: string) => {
    const bunchPath = `items.${lineItemIndex}.bunches.${bunchIndex}` as const;
    form.setValue(`${bunchPath}.variety`, '');
    form.setValue(`${bunchPath}.color`, '');
    form.setValue(`${bunchPath}.productoId`, '');

    const varieties = getVarietiesForProduct(productName);
    if(varieties.length === 1){
        form.setValue(`${bunchPath}.variety`, varieties[0]);
        handleVarietyChange(lineItemIndex, bunchIndex, varieties[0]);
    }
  };

  const handleVarietyChange = (lineItemIndex: number, bunchIndex: number, varietyName: string) => {
    const bunchPath = `items.${lineItemIndex}.bunches.${bunchIndex}` as const;
    form.setValue(`${bunchPath}.color`, '');
    form.setValue(`${bunchPath}.productoId`, '');
  
    const productName = form.getValues(`${bunchPath}.product`);
    const colors = getColorsForVariety(productName, varietyName);
    
    if (colors.length === 1) {
      const singleColor = colors[0];
      form.setValue(`${bunchPath}.color`, singleColor.color);
      handleColorChange(lineItemIndex, bunchIndex, singleColor);
    }
  };

  const handleColorChange = (lineItemIndex: number, bunchIndex: number, colorData: any) => {
    const bunchPath = `items.${lineItemIndex}.bunches.${bunchIndex}` as const;
    if (colorData) {
        form.setValue(`${bunchPath}.productoId`, colorData.productoId);
        form.setValue(`${bunchPath}.stemsPerBunch`, colorData.tallosPorRamo);
    }
  };

  const suggestedMarcaciones = useMemo(() => {
    if (!referenceValue) return filteredMarcaciones;
    return filteredMarcaciones.filter(m => 
      m.numeroMarcacion.toLowerCase().includes(referenceValue.toLowerCase())
    );
  }, [referenceValue, filteredMarcaciones]);


  async function onSubmit(values: InvoiceFormValues) {
    setIsSubmitting(true);
    setCreditError(null);
    setCreditWarning(null);

<<<<<<< HEAD
=======
    // Credit Check
>>>>>>> origin/main
    const customer = customers.find(c => c.id === values.customerId);
    let creditCheckPassed = true;
    let warningMessage = '';

    if (customer && (values.type === 'sale' || values.type === 'both')) {
      const controlType = customer.tipoControl;

      if (controlType !== 'Ninguna') {
        const customerInvoices = invoices.filter(inv => inv.customerId === customer.id && inv.id !== editId);
        
        let outstandingBalance = 0;
        let hasOverdue = false;
        
        customerInvoices.forEach(inv => {
            const credits = creditNotes.filter(cn => cn.invoiceId === inv.id && cn.type === 'sale').reduce((sum, note) => sum + note.amount, 0);
            const debits = debitNotes.filter(dn => dn.invoiceId === inv.id && dn.type === 'sale').reduce((sum, note) => sum + note.amount, 0);
            const paid = payments.filter(p => p.invoiceId === inv.id && p.type === 'sale').reduce((sum, payment) => sum + payment.amount, 0);

            const invoiceTotal = inv.items.reduce((total, item) => {
<<<<<<< HEAD
                return total + item.bunches.reduce((sub, bunch) => {
                    const productLower = (bunch.product || '').toLowerCase();
                    const isGyp = productLower.includes('gyp');
                    if (isGyp) {
                        return sub + (bunch.bunchesPerBox * item.numberOfBoxes * bunch.salePrice);
                    }
                    return sub + (bunch.stemsPerBunch * bunch.bunchesPerBox * item.numberOfBoxes * bunch.salePrice);
                }, 0);
=======
                return total + item.bunches.reduce((sub, bunch) => sub + (bunch.stemsPerBunch * bunch.bunchesPerBox * bunch.salePrice), 0);
>>>>>>> origin/main
            }, 0);
            
            const balance = invoiceTotal + debits - credits - paid;
            if (balance > 0.01) {
              outstandingBalance += balance;
              if (getInvoiceStatus(parseISO(inv.farmDepartureDate), balance, customer) === 'Overdue') {
                hasOverdue = true;
              }
            }
        });

        const newInvoiceTotal = totals.totalValue;
        const exceedsCreditLimit = customer.cupo > 0 && (outstandingBalance + newInvoiceTotal > customer.cupo);

        if (controlType === 'Advertencia') {
            if (exceedsCreditLimit) warningMessage += `El cliente está superando su límite de crédito de $${customer.cupo.toFixed(2)}. `;
            if (hasOverdue) warningMessage += `El cliente tiene facturas vencidas.`;
            if (warningMessage) setCreditWarning(warningMessage);
        } else {
            let blockReason = '';
            if ((controlType === 'BloquearMonto' || controlType === 'BloquearMontoVencidas') && exceedsCreditLimit) {
                blockReason += `Crédito insuficiente. Límite: $${customer.cupo.toFixed(2)}, Saldo pendiente: $${outstandingBalance.toFixed(2)}, Factura actual: $${newInvoiceTotal.toFixed(2)}. `;
            }
            if ((controlType === 'BloquearVencidas' || controlType === 'BloquearMontoVencidas') && hasOverdue) {
                blockReason += `El cliente tiene facturas vencidas y no se le puede facturar.`;
            }

            if (blockReason) {
                setCreditError(blockReason);
                creditCheckPassed = false;
            }
        }
      }
    }

    if (!creditCheckPassed) {
        setIsSubmitting(false);
        return;
    }
  
    const { id, ...dataToSubmit } = values;

    const invoiceData: Omit<Invoice, 'id' | 'saleStatus' | 'purchaseStatus'> = {
      ...dataToSubmit,
      consignatarioId: values.consignatarioId || '',
      reference: values.reference || '',
      farmDepartureDate: values.farmDepartureDate.toISOString(),
      flightDate: values.flightDate.toISOString(),
      items: values.items.map(item => ({
        ...item,
      })) as LineItem[],
    };

    try {
      if (editId) {
        await updateInvoice(editId, invoiceData as Partial<Omit<Invoice, 'id'>>);
        toast({
          title: t('invoices.new.toast.updateSuccessTitle'),
          description: t('invoices.new.toast.updateSuccessDescription'),
        });
      } else {
        await addInvoice(invoiceData);
        toast({
          title: t('invoices.new.toast.successTitle'),
          description: t('invoices.new.toast.successDescription'),
        });
<<<<<<< HEAD
        if (!duplicateId) {
=======
        if (!duplicateId) { // Only clear session storage for brand new invoices
>>>>>>> origin/main
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      await refreshData();
      const destination = values.type === 'purchase' ? '/accounts-payable' : '/invoices';
      router.push(destination);

    } catch (error) {
      console.error('Error saving invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: editId ? t('invoices.new.toast.updateErrorTitle') : t('invoices.new.toast.errorTitle'),
        description: t('invoices.new.toast.errorDescription', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAppDataLoading) {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">{t('invoices.new.loadingData')}</p>
            </div>
        </div>
    );
  }
<<<<<<< HEAD

  let rowCounter = 0;
=======
>>>>>>> origin/main
  
  return (
    <>
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">{editId ? t('invoices.new.editTitle') : t('invoices.new.title')}</h2>
        <p className="text-muted-foreground">{editId ? t('invoices.new.editDescription') : t('invoices.new.description')}</p>
      </div>

      {creditError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de Límite de Crédito</AlertTitle>
          <AlertDescription>{creditError}</AlertDescription>
        </Alert>
      )}

      {creditWarning && (
        <Alert variant="default" className="bg-yellow-100 border-yellow-300 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Advertencia de Crédito</AlertTitle>
          <AlertDescription>{creditWarning}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('invoices.new.detailsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>{t('invoices.new.invoiceType')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col md:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sale" />
                          </FormControl>
                          <FormLabel className="font-normal">{t('invoices.new.typeSale')}</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="purchase" />
                          </FormControl>
                          <FormLabel className="font-normal">{t('invoices.new.typePurchase')}</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="both" />
                          </FormControl>
                          <FormLabel className="font-normal">{t('invoices.new.typeBoth')}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.invoiceNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('invoices.new.invoiceNumberPlaceholder')} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="farmDepartureDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('invoices.new.farmDepartureDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(toDate(field.value), 'PPP') : <span>{t('invoices.new.selectDate')}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="flightDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('invoices.new.flightDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(toDate(field.value), 'PPP') : <span>{t('invoices.new.selectDate')}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
<<<<<<< HEAD
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus />
=======
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date('1900-01-01')} initialFocus />
>>>>>>> origin/main
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.seller')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.new.sellerPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendedores.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
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
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.customer')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.new.customerPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="consignatarioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.consignee')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!selectedCustomerId || filteredConsignatarios.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedCustomerId ? t('invoices.new.selectCustomerFirst') : t('invoices.new.consigneePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredConsignatarios.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombreConsignatario}
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
                name="farmId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.farm')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.new.farmPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fincas.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
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
                name="carrierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.carrier')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.new.carrierPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cargueras.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombreCarguera}
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
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.country')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!!selectedCustomerId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.new.countryPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paises.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.reference')}</FormLabel>
                    <Popover open={isReferenceOpen} onOpenChange={setIsReferenceOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            disabled={!selectedCustomerId || filteredMarcaciones.length === 0}
                          >
                            {field.value || (!selectedCustomerId ? t('invoices.new.selectCustomerFirst') : filteredMarcaciones.length === 0 ? t('invoices.new.noMarkings') : t('invoices.new.markingPlaceholder'))}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Input
                          placeholder={t('invoices.new.markingPlaceholder')}
                          className="h-9"
                          value={field.value}
                          onChange={field.onChange}
                          onFocus={() => setIsReferenceOpen(true)}
                        />
                        <div className="max-h-60 overflow-auto">
                          {suggestedMarcaciones.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                form.setValue('reference', m.numeroMarcacion);
                                setIsReferenceOpen(false);
                              }}
                              className="p-2 text-sm hover:bg-accent cursor-pointer"
                            >
                              {m.numeroMarcacion}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="masterAWB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.masterAWB')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('invoices.new.masterAWBPlaceholder')} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="houseAWB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.new.houseAWB')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('invoices.new.houseAWBPlaceholder')} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('invoices.new.itemsTitle')}</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {t('invoices.new.addItem')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">{t('invoices.new.items.no')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.boxCount')}</TableHead>
                                <TableHead className="w-32">{t('invoices.new.items.boxType')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.bunchCount')}</TableHead>
                                <TableHead className="min-w-[150px]">{t('invoices.new.items.product')}</TableHead>
                                <TableHead className="min-w-[150px]">{t('invoices.new.items.variety')}</TableHead>
                                <TableHead className="min-w-[150px]">{t('invoices.new.items.color')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.length')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.stemsPerBunch')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.bunchesPerBox')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.purchasePrice')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.salePrice')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.totalStems')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.total')}</TableHead>
                                <TableHead className="w-24">{t('invoices.new.items.difference')}</TableHead>
                                <TableHead className="w-[100px]">{t('invoices.new.items.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lineItems.map((lineItem, lineItemIndex) => (
                                <React.Fragment key={lineItem.id}>
                                    {Array.isArray(lineItem.bunches) && lineItem.bunches.map((bunch, bunchIndex) => {
                                        rowCounter++;
                                        const bunchPath = `items.${lineItemIndex}.bunches.${bunchIndex}` as const;
                                        const lineItemPath = `items.${lineItemIndex}` as const;
                                        
<<<<<<< HEAD
                                        const productName = form.watch(`${bunchPath}.product`) || '';
                                        const isGyp = productName.toLowerCase().includes('gyp');
                                        
=======
>>>>>>> origin/main
                                        const salePrice = form.watch(`${bunchPath}.salePrice`) || 0;
                                        const purchasePrice = form.watch(`${bunchPath}.purchasePrice`) || 0;
                                        const stemsPerBunch = form.watch(`${bunchPath}.stemsPerBunch`) || 0;
                                        const bunchesPerBox = form.watch(`${bunchPath}.bunchesPerBox`) || 0;
                                        const numberOfBoxes = form.watch(`${lineItemPath}.numberOfBoxes`) || 0;

                                        const totalStems = stemsPerBunch * bunchesPerBox * numberOfBoxes;
<<<<<<< HEAD
                                        
                                        const totalValueNumeric = isGyp 
                                            ? (bunchesPerBox * numberOfBoxes * salePrice)
                                            : (totalStems * salePrice);
                                            
                                        const totalValue = totalValueNumeric.toFixed(2);
=======
                                        const totalValue = (totalStems * salePrice).toFixed(2);
>>>>>>> origin/main
                                        
                                        let differencePercent = '0 %';
                                        if (purchasePrice > 0) {
                                            differencePercent = (((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(2) + ' %';
                                        } else if (salePrice > 0) {
                                            differencePercent = '∞ %';
                                        }

                                        const selectedProduct = form.watch(`${bunchPath}.product`);
                                        const selectedVariety = form.watch(`${bunchPath}.variety`);
                                        const varieties = getVarietiesForProduct(selectedProduct);
                                        const colors = getColorsForVariety(selectedProduct, selectedVariety);

                                        return (
                                            <TableRow key={bunch.id}>
                                                <TableCell className="align-top pt-2 font-medium">{rowCounter}</TableCell>
                                                <TableCell className="align-top pt-2">
                                                    {bunchIndex === 0 ? <FormField control={form.control} name={`items.${lineItemIndex}.numberOfBoxes`} render={({ field }) => <Input type="number" {...field} value={field.value ?? 0} className="w-24 py-2" />} /> : null}
                                                </TableCell>
                                                <TableCell className="align-top pt-2">
                                                     {bunchIndex === 0 ? (
                                                        <FormField control={form.control} name={`items.${lineItemIndex}.boxType`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                                                    <FormControl><SelectTrigger className="w-32 py-2"><SelectValue/></SelectTrigger></FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="hb">HB</SelectItem>
                                                                        <SelectItem value="qb">QB</SelectItem>
                                                                        <SelectItem value="eb">EB</SelectItem>
                                                                        <SelectItem value="jhb">JHB</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )} />
                                                        ) : null}
                                                </TableCell>
                                                <TableCell className="align-top pt-2">
                                                    {bunchIndex === 0 ? (
                                                        <FormField 
                                                            control={form.control} 
                                                            name={`items.${lineItemIndex}.numberOfBunches`} 
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input type="number" {...field} value={field.value ?? 0} className="w-24 py-2" onBlur={() => form.trigger(`items.${lineItemIndex}.numberOfBunches`)} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="min-w-[150px]"><FormField control={form.control} name={`${bunchPath}.product`} render={({ field }) => (
                                                    <Select onValueChange={(value) => { field.onChange(value); handleProductChange(lineItemIndex, bunchIndex, value); }} value={field.value ?? ''}>
                                                        <FormControl><SelectTrigger className="py-2"><SelectValue placeholder={t('invoices.new.items.productPlaceholder')} /></SelectTrigger></FormControl>
                                                        <SelectContent>{uniqueProducts.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )} /></TableCell>
                                                <TableCell className="min-w-[150px]"><FormField control={form.control} name={`${bunchPath}.variety`} render={({ field }) => (
                                                     <Select onValueChange={(value) => { field.onChange(value); handleVarietyChange(lineItemIndex, bunchIndex, value); }} value={field.value ?? ''} disabled={!selectedProduct}>
                                                        <FormControl><SelectTrigger className="py-2"><SelectValue placeholder={t('invoices.new.items.varietyPlaceholder')} /></SelectTrigger></FormControl>
                                                        <SelectContent>{varieties.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )}/></TableCell>
                                                <TableCell className="min-w-[150px]"><FormField control={form.control} name={`${bunchPath}.color`} render={({ field }) => (
                                                    <Select onValueChange={(value) => { 
                                                        field.onChange(value); 
                                                        const colorData = colors.find(c => c.color === value); 
                                                        handleColorChange(lineItemIndex, bunchIndex, colorData); 
                                                    }} value={field.value ?? ''} disabled={!selectedVariety}>
                                                        <FormControl><SelectTrigger className="py-2"><SelectValue placeholder={t('invoices.new.items.colorPlaceholder')} /></SelectTrigger></FormControl>
<<<<<<< HEAD
                                                        <SelectContent>
                                                          {colors.map(c => (
                                                            <SelectItem key={c.productoId} value={c.color}>{c.color}</SelectItem>
                                                          ))}
                                                        </SelectContent>
=======
                                                        <SelectContent>{colors.map(c => <SelectItem key={c.productoId} value={c.color}>{c.color}</SelectItem>)}</SelectContent>
>>>>>>> origin/main
                                                    </Select>
                                                )}/></TableCell>
                                                <TableCell>
                                                  <FormField 
                                                    control={form.control} 
                                                    name={`${bunchPath}.length`} 
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormControl>
                                                          <Input type="text" {...field} value={field.value ?? ''} className="w-24 py-2"/>
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                </TableCell>
                                                <TableCell><FormField control={form.control} name={`${bunchPath}.stemsPerBunch`} render={({ field }) => <Input type="number" {...field} value={field.value ?? 0} className="w-24 py-2"/>}/></TableCell>
                                                <TableCell>
                                                    <FormField 
                                                        control={form.control} 
                                                        name={`${bunchPath}.bunchesPerBox`} 
                                                        render={({ field }) => (
                                                            <Input 
                                                                type="number" {...field} 
                                                                onBlur={() => form.trigger(`items.${lineItemIndex}.numberOfBunches`)} 
                                                                value={field.value ?? 0} 
                                                                className="w-24 py-2"
                                                            />
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell><FormField control={form.control} name={`${bunchPath}.purchasePrice`} render={({ field }) => <Input type="number" step="0.01" {...field} value={field.value ?? 0} className="w-24 py-2"/>}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`${bunchPath}.salePrice`} render={({ field }) => <Input type="number" step="0.01" {...field} value={field.value ?? 0} className="w-24 py-2"/>}/></TableCell>
                                                <TableCell><Input readOnly disabled value={totalStems} className="w-24 bg-muted/50 py-2" /></TableCell>
                                                <TableCell><Input readOnly disabled value={`$${totalValue}`} className="w-24 bg-muted/50 py-2" /></TableCell>
                                                <TableCell><Input readOnly disabled value={differencePercent} className="w-28 bg-muted/50 py-2" /></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {bunchIndex === 0 && (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleAddBunch(lineItemIndex)}>
                                                                <PlusCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => setItemToDelete({ lineItemIndex, bunchIndex })}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold">{t('invoices.new.items.totals')}</TableCell>
                                <TableCell className="font-bold">{totals.totalBoxTypeValue.toFixed(2)}</TableCell>
                                <TableCell className="font-bold">{totals.totalBoxes}</TableCell>
                                <TableCell className="font-bold">{totals.totalBunches}</TableCell>
                                <TableCell colSpan={3}></TableCell>
                                <TableCell className="font-bold">{totals.totalStemsPerBunch}</TableCell>
                                <TableCell className="font-bold">{totals.totalBunchesPerBox}</TableCell>
                                <TableCell className="font-bold">${totals.averagePurchasePrice.toFixed(2)}</TableCell>
                                <TableCell className="font-bold">${totals.averageSalePrice.toFixed(2)}</TableCell>
                                <TableCell className="font-bold">{totals.totalStems}</TableCell>
                                <TableCell className="font-bold">${totals.totalValue.toFixed(2)}</TableCell>
                                <TableCell className="font-bold">
                                    {isFinite(totals.averageDifference) ? `${totals.averageDifference.toFixed(2)} %` : '∞ %'}
                                </TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
                <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/invoices')} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t('common.saving') : (editId ? t('invoices.new.saveChanges') : t('invoices.new.save'))}
            </Button>
          </div>
        </form>
      </Form>
    </div>
    <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.new.deleteRowTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.new.deleteRowDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBunch} className={buttonVariants({ variant: "destructive" })}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
