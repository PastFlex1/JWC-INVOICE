
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
import { addMarcacion, updateMarcacion, deleteMarcacion } from '@/services/marcaciones';
import type { Marcacion } from '@/lib/types';
import { MarcacionForm } from './marcacion-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';

type MarcacionFormData = Omit<Marcacion, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function MarcacionClient() {
  const { marcaciones, customers, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMarcacion, setEditingMarcacion] = useState<Marcacion | null>(null);
  const [marcacionToDelete, setMarcacionToDelete] = useState<Marcacion | null>(null);
  const { toast } = useToast();
  
  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
        acc[customer.id] = customer.name;
        return acc;
    }, {} as Record<string, string>);
  }, [customers]);

  const totalPages = Math.ceil(marcaciones.length / ITEMS_PER_PAGE);

  const paginatedMarcaciones = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return marcaciones.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [marcaciones, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = (marcacion: Marcacion | null = null) => {
    setEditingMarcacion(marcacion);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingMarcacion(null);
  };

  const handleFormSubmit = async (marcacionData: MarcacionFormData) => {
    setIsSubmitting(true);

    try {
      if (marcacionData.id) {
        await updateMarcacion(marcacionData.id, marcacionData as Marcacion);
        toast({ title: 'Success', description: 'Marking updated successfully.' });
      } else {
        await addMarcacion(marcacionData as Omit<Marcacion, 'id'>);
        toast({ title: 'Success', description: 'Marking added successfully.' });
      }
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting marking:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Saving',
        description: `Could not save the marking: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (marcacion: Marcacion) => {
    setMarcacionToDelete(marcacion);
  };

  const handleDeleteConfirm = async () => {
    if (!marcacionToDelete) return;

    try {
      await deleteMarcacion(marcacionToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Marking deleted successfully.' });
    } catch (error) {
      console.error("Error deleting marking:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Deleting',
        description: `Could not delete the marking: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setMarcacionToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('marcacion.title')}</h2>
            <p className="text-muted-foreground">{t('marcacion.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('marcacion.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMarcacion ? 'Edit Marking' : 'Add New Marking'}</DialogTitle>
            </DialogHeader>
            <MarcacionForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingMarcacion}
              isSubmitting={isSubmitting}
              customers={customers}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Marking List</CardTitle>
            <CardDescription>A list of all your markings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marking Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMarcaciones.map((marcacion) => (
                  <TableRow key={marcacion.id}>
                    <TableCell className="font-medium">{marcacion.numeroMarcacion}</TableCell>
                    <TableCell>{customerMap[marcacion.cliente] || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(marcacion)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(marcacion)}>
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

      <AlertDialog open={!!marcacionToDelete} onOpenChange={(open) => !open && setMarcacionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the marking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMarcacionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
