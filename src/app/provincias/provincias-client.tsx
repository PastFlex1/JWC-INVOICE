
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
import { addProvincia, updateProvincia, deleteProvincia } from '@/services/provincias';
import type { Provincia } from '@/lib/types';
import { ProvinciaForm } from './provincia-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';
import { provincias as defaultProvincias } from '@/lib/mock-data';

type ProvinciaFormData = Omit<Provincia, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function ProvinciasClient() {
  const { provincias, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvincia, setEditingProvincia] = useState<Provincia | null>(null);
  const [provinciaToDelete, setProvinciaToDelete] = useState<Provincia | null>(null);
  const { toast } = useToast();

  const defaultProvinciaIds = useMemo(() => new Set(defaultProvincias.map(p => p.id)), []);
  
  const totalPages = Math.ceil(provincias.length / ITEMS_PER_PAGE);

  const paginatedProvincias = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return provincias.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [provincias, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));


  const handleOpenDialog = (provincia: Provincia | null = null) => {
    setEditingProvincia(provincia);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingProvincia(null);
  };

  const handleFormSubmit = async (provinciaData: ProvinciaFormData) => {
    setIsSubmitting(true);
    
    try {
        const isDefaultItem = provinciaData.id ? defaultProvinciaIds.has(provinciaData.id) : false;

        if (provinciaData.id && !isDefaultItem) {
            await updateProvincia(provinciaData.id, provinciaData as Provincia);
            toast({ title: 'Success', description: 'Province updated successfully.' });
        } else {
            const { id, ...dataToAdd } = provinciaData;
            await addProvincia(dataToAdd as Omit<Provincia, 'id'>);
            toast({ title: 'Success', description: 'Province added successfully.' });
        }
        await refreshData();
        handleCloseDialog();
    } catch (error) {
        console.error("Error submitting province:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
            title: 'Error Saving',
            description: `Could not save the province: ${errorMessage}.`,
            variant: 'destructive',
            duration: 10000,
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (provincia: Provincia) => {
    setProvinciaToDelete(provincia);
  };

  const handleDeleteConfirm = async () => {
    if (!provinciaToDelete) return;
    
    try {
      await deleteProvincia(provinciaToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Province deleted successfully.' });
    } catch (error) {
        console.error("Error deleting provincia:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
            title: 'Error Deleting',
            description: `Could not delete the province: ${errorMessage}.`,
            variant: 'destructive',
            duration: 10000,
        });
    } finally {
        setProvinciaToDelete(null);
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('provincias.title')}</h2>
            <p className="text-muted-foreground">{t('provincias.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('provincias.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProvincia ? 'Edit Province' : 'Add New Province'}</DialogTitle>
            </DialogHeader>
            <ProvinciaForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingProvincia}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Province List</CardTitle>
            <CardDescription>A list of all your provinces.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProvincias.map((provincia) => (
                  <TableRow key={provincia.id}>
                    <TableCell className="font-medium">{provincia.nombre}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(provincia)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(provincia)}>
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
            </CardFooter>
          )}
        </Card>
      </div>

      <AlertDialog open={!!provinciaToDelete} onOpenChange={(open) => !open && setProvinciaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the province.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProvinciaToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
