
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
import { addPais, updatePais, deletePais } from '@/services/paises';
import type { Pais } from '@/lib/types';
import { PaisForm } from './pais-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';


type PaisFormData = Omit<Pais, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function PaisClient() {
  const { paises, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPais, setEditingPais] = useState<Pais | null>(null);
  const [paisToDelete, setPaisToDelete] = useState<Pais | null>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(paises.length / ITEMS_PER_PAGE);

  const paginatedPaises = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return paises.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [paises, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = (pais: Pais | null = null) => {
    setEditingPais(pais);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if(isSubmitting) return;
    setIsDialogOpen(false);
    setEditingPais(null);
  };

  const handleFormSubmit = async (paisData: PaisFormData) => {
    setIsSubmitting(true);
    
    try {
      if (paisData.id) {
        await updatePais(paisData.id, paisData as Pais);
        toast({ title: 'Success', description: 'Country updated successfully.' });
      } else {
        await addPais(paisData as Omit<Pais, 'id'>);
        toast({ title: 'Success', description: 'Country added successfully.' });
      }
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting country:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Saving',
        description: `Could not save the country: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (pais: Pais) => {
    setPaisToDelete(pais);
  };

  const handleDeleteConfirm = async () => {
    if (!paisToDelete) return;
    
    try {
      await deletePais(paisToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Country deleted successfully.' });
    } catch (error) {
      console.error("Error deleting country:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Deleting',
        description: `Could not delete the country: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
        setPaisToDelete(null);
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('pais.title')}</h2>
            <p className="text-muted-foreground">{t('pais.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('pais.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPais ? 'Edit Country' : 'Add New Country'}</DialogTitle>
            </DialogHeader>
            <PaisForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingPais}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Country List</CardTitle>
            <CardDescription>A list of all your countries.</CardDescription>
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
                {paginatedPaises.map((pais) => (
                  <TableRow key={pais.id}>
                    <TableCell className="font-medium">{pais.nombre}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(pais)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(pais)}>
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

      <AlertDialog open={!!paisToDelete} onOpenChange={(open) => !open && setPaisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the country.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaisToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
