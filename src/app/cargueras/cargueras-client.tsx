
'use client';

import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { addCarguera, updateCarguera, deleteCarguera } from '@/services/cargueras';
import type { Carguera } from '@/lib/types';
import { CargueraForm } from './carguera-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { cargueras as defaultCargueras } from '@/lib/mock-data';

type CargueraFormData = Omit<Carguera, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function CarguerasClient() {
  const { cargueras, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCarguera, setEditingCarguera] = useState<Carguera | null>(null);
  const [cargueraToDelete, setCargueraToDelete] = useState<Carguera | null>(null);
  const { toast } = useToast();

  const defaultCargueraIds = useMemo(() => new Set(defaultCargueras.map(c => c.id)), []);

  const totalPages = Math.ceil(cargueras.length / ITEMS_PER_PAGE);

  const paginatedCargueras = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return cargueras.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [cargueras, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = (carguera: Carguera | null = null) => {
    setEditingCarguera(carguera);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingCarguera(null);
  };

  const handleFormSubmit = async (cargueraData: CargueraFormData) => {
    setIsSubmitting(true);
    
    try {
        const isDefaultItem = cargueraData.id ? defaultCargueraIds.has(cargueraData.id) : false;

        if (cargueraData.id && !isDefaultItem) {
            await updateCarguera(cargueraData.id, cargueraData as Carguera);
            toast({ title: t('common.success'), description: t('cargueras.toast.updated') });
        } else {
            const { id, ...dataToAdd } = cargueraData;
            await addCarguera(dataToAdd as Omit<Carguera, 'id'>);
            toast({ title: t('common.success'), description: t('cargueras.toast.added') });
        }
        await refreshData();
        handleCloseDialog();
    } catch (error) {
        console.error("Error submitting form:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
            title: t('common.errorSaving'),
            description: t('cargueras.toast.error', { error: errorMessage }),
            variant: 'destructive',
            duration: 10000,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (carguera: Carguera) => {
    setCargueraToDelete(carguera);
  };

  const handleDeleteConfirm = async () => {
    if (!cargueraToDelete) return;
    
    try {
      await deleteCarguera(cargueraToDelete.id);
      await refreshData();
      toast({ title: t('common.success'), description: t('cargueras.toast.deleted') });
    } catch (error) {
      console.error("Error deleting carguera:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: t('common.errorDeleting'),
        description: t('cargueras.toast.deleteError', { error: errorMessage }),
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setCargueraToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('cargueras.title')}</h2>
            <p className="text-muted-foreground">{t('cargueras.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('cargueras.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCarguera ? t('cargueras.editTitle') : t('cargueras.addTitle')}</DialogTitle>
            </DialogHeader>
            <CargueraForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingCarguera}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>{t('cargueras.list.title')}</CardTitle>
            <CardDescription>{t('cargueras.list.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('cargueras.list.name')}</TableHead>
                  <TableHead>{t('cargueras.list.country')}</TableHead>
                  <TableHead className="text-right">{t('common.actions.title')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCargueras.map((carguera) => (
                  <TableRow key={carguera.id}>
                    <TableCell className="font-medium">{carguera.nombreCarguera}</TableCell>
                    <TableCell>{carguera.pais}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(carguera)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(carguera)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
           {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('common.page', { currentPage: currentPage, totalPages: totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      <AlertDialog open={!!cargueraToDelete} onOpenChange={(open) => !open && setCargueraToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cargueras.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCargueraToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
