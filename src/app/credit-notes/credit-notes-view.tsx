'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { CreditNote } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';

type CreditNoteWithCustomer = CreditNote & { customerName?: string };

type CreditNotesViewProps = {
  notes: CreditNoteWithCustomer[];
  onDelete: (note: CreditNote) => void;
};

export function CreditNotesView({ notes, onDelete }: CreditNotesViewProps) {
    const { t } = useTranslation();
    const totalAmount = notes.reduce((sum, note) => sum + note.amount, 0);

  return (
    <Card className="p-6 bg-white text-black shadow-lg border print:shadow-none print:border-0" id="credit-notes-to-print">
      <CardContent className="p-0 text-sm leading-tight">
        <header className="flex justify-between items-start mb-6">
          <div className="w-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="JCW Flowers Logo" width={200} height={60} className="mb-4" />
            <div className="text-xs">
              <p>El Quinche, Pasaje F y Calle Quito</p>
              <p>Quito</p>
              <p>Ecuador</p>
              <p><strong>E-mail:</strong> jcwf@outlook.es</p>
              <p><strong>Phone:</strong> 096 744 1343</p>
            </div>
          </div>
          <div className="w-1/2 flex flex-col items-end">
            <h1 className="text-xl font-bold mb-4 tracking-wider">REPORTE DE NOTAS DE CRÉDITO</h1>
          </div>
        </header>

        <section>
          <div className="grid grid-cols-[120px,120px,1fr,200px,120px,80px] font-bold text-center bg-gray-200 border-t border-l border-r border-black text-xs">
            <div className="p-1 border-r border-black">{t('creditNotes.list.date')}</div>
            <div className="p-1 border-r border-black">{t('creditNotes.list.invoice')}</div>
            <div className="p-1 border-r border-black">CLIENTE</div>
            <div className="p-1 border-r border-black">{t('creditNotes.list.reason')}</div>
            <div className="p-1 border-r border-black">{t('creditNotes.list.amount')}</div>
            <div className="p-1">{t('common.actions')}</div>
          </div>
          <div className="border-l border-r border-b border-black text-xs">
            {notes.length === 0 && (
                <div className="text-center p-4 text-muted-foreground">No se encontraron notas de crédito.</div>
            )}
            {notes.map(note => (
              <div key={note.id} className="grid grid-cols-[120px,120px,1fr,200px,120px,80px] border-b border-gray-300">
                <div className="p-1 text-center">{format(parseISO(note.date), 'dd/MM/yyyy')}</div>
                <div className="p-1 text-center">{note.invoiceNumber}</div>
                <div className="p-1">{note.customerName}</div>
                <div className="p-1">{note.reason}</div>
                <div className="p-1 text-right">${note.amount.toFixed(2)}</div>
                <div className="p-1 text-center">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(note)} className="h-6 w-6">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[120px,120px,1fr,200px,120px,80px] font-bold text-xs bg-gray-200 border-b border-l border-r border-black">
              <div className="p-1 border-r border-black col-span-4 text-center">TOTAL</div>
              <div className="p-1 text-right">${totalAmount.toFixed(2)}</div>
              <div className="p-1"></div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
