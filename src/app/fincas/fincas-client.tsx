
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { addFinca, updateFinca, deleteFinca } from '@/services/fincas';
import type { Finca } from '@/lib/types';
import { FincaForm } from './finca-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';

type FincaFormData = Omit<Finca, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function FincasClient() {
  const { fincas, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFinca, setEditingFinca] = useState<Finca | null>(null);
  const [fincaToDelete, setFincaToDelete] = useState<Finca | null>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(fincas.length / ITEMS_PER_PAGE);

  const paginatedFincas = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return fincas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [fincas, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));


  const handleOpenDialog = (finca: Finca | null = null) => {
    setEditingFinca(finca);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingFinca(null);
  };

  const handleFormSubmit = async (fincaData: FincaFormData) => {
    setIsSubmitting(true);

    try {
      if (fincaData.id) {
        await updateFinca(fincaData.id, fincaData as Finca);
        toast({ title: 'Success', description: 'Farm updated successfully.' });
      } else {
        await addFinca(fincaData);
        toast({ title: 'Success', description: 'Farm added successfully.' });
      }
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting farm:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Saving',
        description: `Could not save the farm: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (finca: Finca) => {
    setFincaToDelete(finca);
  };

  const handleDeleteConfirm = async () => {
    if (!fincaToDelete) return;

    try {
      await deleteFinca(fincaToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Farm deleted successfully.' });
    } catch (error) {
      console.error("Error deleting farm:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Deleting',
        description: `Could not delete the farm: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
        setFincaToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('fincas.title')}</h2>
            <p className="text-muted-foreground">{t('fincas.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('fincas.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFinca ? 'Edit Farm' : 'Add New Farm'}</DialogTitle>
            </DialogHeader>
            <FincaForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingFinca}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Farm List</CardTitle>
            <CardDescription>A list of all your saved farms.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tax ID / RUC</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFincas.map((finca) => (
                  <TableRow key={finca.id}>
                    <TableCell className="font-medium">{finca.name}</TableCell>
                    <TableCell>{finca.address}</TableCell>
                    <TableCell>{finca.phone}</TableCell>
                    <TableCell>{finca.taxId}</TableCell>
                    <TableCell>{finca.productType}</TableCell>
                    <TableCell className="text-right space-x-0">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(finca)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(finca)}>
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

      <AlertDialog open={!!fincaToDelete} onOpenChange={(open) => !open && setFincaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the farm from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFincaToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
