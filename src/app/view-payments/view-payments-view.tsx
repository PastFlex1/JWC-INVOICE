
'use client';

import { useState, useMemo } from 'react';
import { Eye, Download, Mail, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AggregatedPayment } from './view-payments-client';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '@/context/i18n-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PaymentReceiptDownloadPdfButton from './payment-receipt-download-pdf';
import PaymentReceiptDownloadExcelButton from './payment-receipt-download-excel';

const ITEMS_PER_PAGE = 15;

type ViewPaymentsViewProps = {
  payments: AggregatedPayment[];
  onViewPayment: (payment: AggregatedPayment) => void;
  onSendPayment: (payment: AggregatedPayment) => void;
  onDeletePayment: (payment: AggregatedPayment) => void;
};

export function ViewPaymentsView({ payments, onViewPayment, onSendPayment, onDeletePayment }: ViewPaymentsViewProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return payments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [payments, currentPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('viewPayments.table.date')}</TableHead>
              <TableHead>{t('viewPayments.table.entity')}</TableHead>
              <TableHead>{t('viewPayments.table.totalAmount')}</TableHead>
              <TableHead>{t('viewPayments.table.bankFee')}</TableHead>
              <TableHead>{t('viewPayments.table.invoicesPaid')}</TableHead>
              <TableHead>{t('viewPayments.table.method')}</TableHead>
              <TableHead>{t('viewPayments.table.bank')}</TableHead>
              <TableHead className="text-right">{t('common.actions.title')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(parseISO(payment.paymentDate), 'PPP')}</TableCell>
                <TableCell className="font-medium">{payment.entityName}</TableCell>
                <TableCell className="font-bold">${payment.amount.toFixed(2)}</TableCell>
                <TableCell className="text-destructive">${(payment.bankFee || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t('viewPayments.table.paidToInvoices', { count: payment.details.length })}
                  </Badge>
                </TableCell>
                <TableCell>{payment.paymentMethod}</TableCell>
                <TableCell>{payment.reference}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title={t('viewPayments.table.viewDetails')} onClick={() => onViewPayment(payment)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={t('viewPayments.table.sendEmail')} onClick={() => onSendPayment(payment)}>
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => onDeletePayment(payment)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" title={t('viewPayments.table.download')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <PaymentReceiptDownloadPdfButton payment={payment} />
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <PaymentReceiptDownloadExcelButton payment={payment} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between mt-4">
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
    </>
  );
}

