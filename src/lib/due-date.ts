import type { Customer } from './types';
import { add, isPast, startOfDay } from 'date-fns';

export function calculateDueDate(invoiceDate: Date, customer: Customer | null): Date {
  if (!customer || customer.type === 'National') {
    return invoiceDate;
  }

  // If plazo is 0, it's prepaid, so due date is the invoice date itself.
  const plazoDays = customer.plazo || 0;
  return add(invoiceDate, { days: plazoDays });
}

export function getInvoiceStatus(
    invoiceDate: Date, 
    balance: number, 
    customer: Customer | null
): 'Paid' | 'Pending' | 'Overdue' {
    if (balance <= 0.01) {
        return 'Paid';
    }
    
    // We use startOfDay to ensure the comparison is fair. 
    // An invoice created today should not be overdue today.
    const dueDate = startOfDay(calculateDueDate(new Date(invoiceDate), customer));
    const today = startOfDay(new Date());

    return today > dueDate ? 'Overdue' : 'Pending';
}
