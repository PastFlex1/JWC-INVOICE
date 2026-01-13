
'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { addVendedor, updateVendedor, deleteVendedor } from '@/services/vendedores';
import type { Vendedor } from '@/lib/types';
import { VendedorForm } from './vendedor-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';

type VendedorFormData = Omit<Vendedor, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function VendedoresClient() {
  const { vendedores, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [vendedorToDelete, setVendedorToDelete] = useState<Vendedor | null>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(vendedores.length / ITEMS_PER_PAGE);

  const paginatedVendedores = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return vendedores.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [vendedores, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = (vendedor: Vendedor | null = null) => {
    setEditingVendedor(vendedor);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingVendedor(null);
  };

  const handleFormSubmit = async (vendedorData: VendedorFormData) => {
    setIsSubmitting(true);
    
    try {
      if (vendedorData.id) {
        await updateVendedor(vendedorData.id, vendedorData as Vendedor);
        toast({ title: 'Success', description: 'Seller updated successfully.' });
      } else {
        await addVendedor(vendedorData as Omit<Vendedor, 'id'>);
        toast({ title: 'Success', description: 'Seller added successfully.' });
      }
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting seller:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Saving',
        description: `Could not save the seller: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteClick = (vendedor: Vendedor) => {
    setVendedorToDelete(vendedor);
  };

  const handleDeleteConfirm = async () => {
    if (!vendedorToDelete) return;
    
    try {
      await deleteVendedor(vendedorToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Seller deleted successfully.' });
    } catch (error) {
      console.error("Error deleting seller:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Deleting',
        description: `Could not delete the seller: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setVendedorToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('vendedores.title')}</h2>
            <p className="text-muted-foreground">{t('vendedores.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('vendedores.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingVendedor ? 'Edit Seller' : 'Add New Seller'}</DialogTitle>
            </DialogHeader>
            <VendedorForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingVendedor}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {paginatedVendedores.map((vendedor) => (
            <Card key={vendedor.id} className="flex flex-col">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center flex-grow">
                <h3 className="text-xl font-semibold">{vendedor.nombre}</h3>
                <p className="text-muted-foreground">{vendedor.siglas}</p>
              </CardContent>
              <CardFooter className="p-4 border-t flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(vendedor)}>
                  {t('vendedores.edit')}
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(vendedor)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t('vendedores.delete')}</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
         {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!vendedorToDelete} onOpenChange={(open) => !open && setVendedorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the seller.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVendedorToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
