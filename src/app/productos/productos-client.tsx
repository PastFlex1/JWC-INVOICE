

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Search, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addProducto, updateProducto, deleteProducto } from '@/services/productos';
import { addVariedad, getVariedades, deleteVariedad } from '@/services/variedades';
import type { Producto, Variedad } from '@/lib/types';
import { ProductoForm } from './producto-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { VariedadForm } from './variedad-form';

type ProductoFormData = Omit<Producto, 'id'> & { id?: string };
type VariedadFormData = Omit<Variedad, 'id'> & { id?: string };
type PendingChanges = {
    [productId: string]: Partial<Omit<Producto, 'id'>>;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export function ProductosClient() {
  const { productos, variedades, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [isProductoDialogOpen, setIsProductoDialogOpen] = useState(false);
  const [isVariedadDialogOpen, setIsVariedadDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [productoToDelete, setProductoToDelete] = useState<Producto | null>(null);
  const [variedadToDelete, setVariedadToDelete] = useState<Variedad | null>(null);
  const [selectedVariedad, setSelectedVariedad] = useState<Variedad | null>(null);
  const [isViewProductsDialogOpen, setIsViewProductsDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});


  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredVariedades = useMemo(() => {
    return variedades.filter(variedad =>
      (variedad.nombre?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase())
    );
  }, [variedades, debouncedSearchTerm]);

  const productosForSelectedVariedad = useMemo(() => {
    if (!selectedVariedad) return [];
    const varietyProducts = productos.filter(p => p.variedad === selectedVariedad.nombre);

    // Apply pending changes for display
    return varietyProducts.map(p => ({
        ...p,
        ...pendingChanges[p.id],
    }));

  }, [productos, selectedVariedad, pendingChanges]);


  const handleOpenProductoDialog = (producto: Producto | null = null) => {
    setEditingProducto(producto);
    setIsProductoDialogOpen(true);
  };

  const handleCloseProductoDialog = () => {
    if (isSubmitting) return;
    setIsProductoDialogOpen(false);
    setEditingProducto(null);
  };
  
  const handleOpenVariedadDialog = () => {
    setIsVariedadDialogOpen(true);
  };

  const handleCloseVariedadDialog = () => {
    if (isSubmitting) return;
    setIsVariedadDialogOpen(false);
  };

  const handleProductoFormSubmit = async (productoData: ProductoFormData) => {
    setIsSubmitting(true);
    try {
      if (productoData.id) {
        const { id, ...dataToUpdate } = productoData;
        await updateProducto(id, dataToUpdate);
        toast({ title: t('common.success'), description: t('productos.toast.updateSuccess') });
      } else {
        await addProducto(productoData);
        toast({ title: t('common.success'), description: t('productos.toast.addSuccess') });
      }
      await refreshData();
      handleCloseProductoDialog();
      // Also close the view dialog if it's open
      if (isViewProductsDialogOpen) {
        setIsViewProductsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorSaving'),
        description: t('productos.toast.saveError', {error: errorMessage}),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVariedadFormSubmit = async (variedadData: { nombre: string }) => {
    setIsSubmitting(true);
    try {
      await addVariedad(variedadData);
      toast({ title: t('common.success'), description: t('productos.toast.addVariedadSuccess') });
      await refreshData();
      handleCloseVariedadDialog();
    } catch (error) {
      console.error("Error submitting variety:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorSaving'),
        description: t('productos.toast.saveVariedadError', {error: errorMessage}),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProductoClick = (producto: Producto) => {
    setProductoToDelete(producto);
  };

  const handleDeleteVariedadClick = (variedad: Variedad) => {
    setVariedadToDelete(variedad);
  };

  const handleDeleteProductoConfirm = async () => {
    if (!productoToDelete) return;
    try {
      await deleteProducto(productoToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('productos.toast.deleteSuccess') });
    } catch (error) {
      console.error("Error deleting product:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorDeleting'),
        description: t('productos.toast.deleteError', {error: errorMessage}),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
        setProductoToDelete(null);
    }
  };

  const handleDeleteVariedadConfirm = async () => {
    if (!variedadToDelete) return;
    const productsUsingVariety = productos.filter(p => p.variedad === variedadToDelete.nombre);
    if (productsUsingVariety.length > 0) {
      toast({
        title: t('common.errorDeleting'),
        description: t('productos.toast.deleteVariedadErrorInUse', { count: productsUsingVariety.length, name: variedadToDelete.nombre }),
        variant: 'destructive',
        duration: 10000,
      });
      setVariedadToDelete(null);
      return;
    }

    try {
      await deleteVariedad(variedadToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('productos.toast.deleteVariedadSuccess') });
    } catch (error) {
      console.error("Error deleting variety:", error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      toast({
        title: t('common.errorDeleting'),
        description: t('productos.toast.deleteVariedadError', {error: errorMessage}),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setVariedadToDelete(null);
    }
  };
  
  const handleStageChange = (productId: string, field: keyof Producto, value: any) => {
    setPendingChanges(prev => ({
        ...prev,
        [productId]: {
            ...prev[productId],
            [field]: value
        }
    }));
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    const changesToSave = Object.entries(pendingChanges);

    try {
        await Promise.all(
            changesToSave.map(([id, data]) => updateProducto(id, data))
        );
        
        await refreshData();
        setPendingChanges({});
        toast({ title: t('common.success'), description: t('productos.toast.bulkUpdateSuccess', { count: changesToSave.length }) });

    } catch (error) {
        toast({ title: t('common.error'), description: t('productos.toast.bulkUpdateError'), variant: 'destructive' });
        await refreshData();
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleViewProducts = (variedad: Variedad) => {
    setSelectedVariedad(variedad);
    setIsViewProductsDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('productos.title')}</h2>
            <p className="text-muted-foreground">{t('productos.description')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenVariedadDialog}>
              <Plus className="mr-2 h-4 w-4" /> {t('productos.addProductType')}
            </Button>
            <Button onClick={() => handleOpenProductoDialog()}>
              <Plus className="mr-2 h-4 w-4" /> {t('productos.addVariety')}
            </Button>
          </div>
        </div>

        <Dialog open={isProductoDialogOpen} onOpenChange={(open) => !open && handleCloseProductoDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProducto ? t('productos.form.editTitle') : t('productos.form.addTitle')}</DialogTitle>
            </DialogHeader>
            <ProductoForm 
              onSubmit={handleProductoFormSubmit}
              onClose={handleCloseProductoDialog}
              initialData={editingProducto}
              isSubmitting={isSubmitting}
              variedades={variedades}
            />
          </DialogContent>
        </Dialog>
        
        <Dialog open={isVariedadDialogOpen} onOpenChange={(open) => !open && handleCloseVariedadDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('productos.variedadForm.addTitle')}</DialogTitle>
            </DialogHeader>
            <VariedadForm 
              onSubmit={handleVariedadFormSubmit}
              onClose={handleCloseVariedadDialog}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{t('productos.list.title')}</CardTitle>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('productos.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-64"
                        />
                    </div>
                </div>
                <CardDescription>{t('productos.list.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVariedades.map((variedad) => (
                  <Card key={variedad.id} className="flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">
                        {variedad.nombre}
                      </CardTitle>
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteVariedadClick(variedad)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {t('productos.varietyCount', { count: productos.filter(p => p.variedad === variedad.nombre).length })}
                      </div>
                    </CardContent>
                    <CardFooter>
                       <Button variant="outline" className="w-full" onClick={() => handleViewProducts(variedad)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('productos.viewVarieties')}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isViewProductsDialogOpen} onOpenChange={setIsViewProductsDialogOpen}>
        <DialogContent 
          className="sm:max-w-4xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('productos.viewDialog.title', { productName: selectedVariedad?.nombre || '' })}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('productos.viewDialog.variety')}</TableHead>
                    <TableHead>{t('productos.viewDialog.color')}</TableHead>
                    <TableHead>{t('productos.viewDialog.stems')}</TableHead>
                    <TableHead>{t('productos.viewDialog.barcode')}</TableHead>
                    <TableHead>{t('productos.viewDialog.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosForSelectedVariedad.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium">{producto.nombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: producto.color }}
                          />
                          <span>{producto.nombreColor}</span>
                        </div>
                      </TableCell>
                       <TableCell>{producto.tallosPorRamo}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          defaultValue={producto.barras}
                          onChange={(e) => handleStageChange(producto.id, 'barras', e.target.value)}
                          className="w-28 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={producto.estado === 'Activo' ? 'secondary' : 'destructive'}
                          className="cursor-pointer"
                          onClick={() => handleStageChange(producto.id, 'estado', producto.estado === 'Activo' ? 'Inactivo' : 'Activo')}
                        >
                          {producto.estado === 'Activo' ? t('productos.status.active') : t('productos.status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-0">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenProductoDialog(producto)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProductoClick(producto)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </div>
           <DialogFooter>
                <Button onClick={handleSaveChanges} disabled={isSubmitting || Object.keys(pendingChanges).length === 0}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? t('common.saving') : t('productos.viewDialog.saveChanges')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!variedadToDelete} onOpenChange={(open) => !open && setVariedadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('productos.confirmDeleteVariedadDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVariedadToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVariedadConfirm} variant="destructive">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!productoToDelete} onOpenChange={(open) => !open && setProductoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('productos.confirmDeleteProductoDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductoToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProductoConfirm} variant="destructive">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
