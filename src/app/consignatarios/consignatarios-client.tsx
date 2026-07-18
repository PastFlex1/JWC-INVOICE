
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
import { addConsignatario, updateConsignatario, deleteConsignatario } from '@/services/consignatarios';
import type { Consignatario } from '@/lib/types';
import { ConsignatarioForm } from './consignatario-form';
import { useAppData } from '@/context/app-data-context';
import { useTranslation } from '@/context/i18n-context';

type ConsignatarioFormData = Omit<Consignatario, 'id'> & { id?: string };

const ITEMS_PER_PAGE = 10;

export function ConsignatariosClient() {
  const { consignatarios, paises, customers, provincias, cargueras, refreshData } = useAppData();
  const { t } = useTranslation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsignatario, setEditingConsignatario] = useState<Consignatario | null>(null);
  const [consignatarioToDelete, setConsignatarioToDelete] = useState<Consignatario | null>(null);
  const { toast } = useToast();

  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.id] = customer.name;
      return acc;
    }, {} as Record<string, string>);
  }, [customers]);

  const carrierMap = useMemo(() => {
    return (cargueras || []).reduce((acc, carrier) => {
      acc[carrier.id] = carrier.nombreCarguera;
      return acc;
    }, {} as Record<string, string>);
  }, [cargueras]);

  const totalPages = Math.ceil(consignatarios.length / ITEMS_PER_PAGE);

  const paginatedConsignatarios = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return consignatarios.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [consignatarios, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleOpenDialog = (consignatario: Consignatario | null = null) => {
    setEditingConsignatario(consignatario);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    setIsDialogOpen(false);
    setEditingConsignatario(null);
  };

  const handleFormSubmit = async (formData: ConsignatarioFormData) => {
    setIsSubmitting(true);
    
    try {
      if (formData.id) {
        await updateConsignatario(formData.id, formData as Consignatario);
        toast({ title: 'Success', description: 'Consignee updated successfully.' });
      } else {
        await addConsignatario(formData as Omit<Consignatario, 'id'>);
        toast({ title: 'Success', description: 'Consignee added successfully.' });
      }
      await refreshData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error Saving',
        description: `Could not save the consignee: ${errorMessage}.`,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (consignatario: Consignatario) => {
    setConsignatarioToDelete(consignatario);
  };

  const handleDeleteConfirm = async () => {
    if (!consignatarioToDelete) return;

    try {
      await deleteConsignatario(consignatarioToDelete.id);
      await refreshData();
      toast({ title: 'Success', description: 'Consignee deleted successfully.' });
    } catch (error) {
        console.error("Error deleting consignatario:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Error Deleting',
          description: `Could not delete the consignee: ${errorMessage}.`,
          variant: 'destructive',
          duration: 10000,
        });
    } finally {
      setConsignatarioToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">{t('consignatarios.title')}</h2>
            <p className="text-muted-foreground">{t('consignatarios.description')}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> {t('consignatarios.add')}
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingConsignatario ? 'Edit Consignee' : 'Add New Consignee'}</DialogTitle>
            </DialogHeader>
            <ConsignatarioForm 
              onSubmit={handleFormSubmit}
              onClose={handleCloseDialog}
              initialData={editingConsignatario}
              paises={paises}
              customers={customers}
              provincias={provincias}
              cargueras={cargueras}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Consignee List</CardTitle>
            <CardDescription>A list of all your consignees.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Agencia</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConsignatarios.map((consignatario) => (
                    <TableRow key={consignatario.id}>
                      <TableCell className="font-medium">{consignatario.nombreConsignatario}</TableCell>
                      <TableCell>{customerMap[consignatario.customerId] || 'N/A'}</TableCell>
                      <TableCell>{carrierMap[consignatario.carrierId || ''] || 'N/A'}</TableCell>
                      <TableCell>{consignatario.pais}</TableCell>
                      <TableCell>{consignatario.provincia}</TableCell>
                      <TableCell>{consignatario.direccion}</TableCell>
                      <TableCell className="text-right space-x-0">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(consignatario)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(consignatario)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

      <AlertDialog open={!!consignatarioToDelete} onOpenChange={(open) => !open && setConsignatarioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the consignee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConsignatarioToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
