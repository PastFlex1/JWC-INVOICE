'use client';

import type { Customer } from './types';
import { add, setDate, startOfDay } from 'date-fns';

export function calculateDueDate(invoiceDate: Date, customer: Customer | null): Date {
  if (!customer || customer.type === 'National') {
    return invoiceDate;
  }
  
  const cleanInvoiceDate = startOfDay(invoiceDate);
  const plazoDays = customer.plazo || 0;

  switch (plazoDays) {
    case 0:
      return cleanInvoiceDate;
    
    case 8:
      return add(cleanInvoiceDate, { days: 8 });

    case 15:
      const dayOfMonth = cleanInvoiceDate.getDate();
      if (dayOfMonth <= 15) {
        return setDate(cleanInvoiceDate, 30);
      } else {
        const nextMonth = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonth, 15);
      }
      
    case 30:
        const nextMonthFor30 = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonthFor30, 30);
    
    case 45:
        const thirdMonth = add(cleanInvoiceDate, { months: 2 });
        return setDate(thirdMonth, 15);

    default:
      return add(cleanInvoiceDate, { days: plazoDays });
  }
}

export function getInvoiceStatus(
    invoiceDate: Date, 
    balance: number, 
    customer: Customer | null
): 'Paid' | 'Pending' | 'Overdue' {
    if (balance <= 0.01) {
        return 'Paid';
    }
    
    const dueDate = startOfDay(calculateDueDate(new Date(invoiceDate), customer));
    const today = startOfDay(new Date());

    return today > dueDate ? 'Overdue' : 'Pending';
}
