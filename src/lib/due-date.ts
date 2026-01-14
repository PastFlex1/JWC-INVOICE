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
    case 0: // CONTADO
      return cleanInvoiceDate;
    
    case 8: // 8 DIAS
      return add(cleanInvoiceDate, { days: 8 });

    case 15: // 15 DIAS
      const dayOfMonth = cleanInvoiceDate.getDate();
      if (dayOfMonth <= 15) {
        return setDate(cleanInvoiceDate, 30); // Vence el 30 del mismo mes
      } else {
        const nextMonth = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonth, 15); // Vence el 15 del siguiente mes
      }
      
    case 30: // 30 DIAS
        const nextMonthFor30 = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonthFor30, 30); // Vence el 30 del siguiente mes
    
    case 45: // 45 DIAS
        const thirdMonth = add(cleanInvoiceDate, { months: 2 });
        return setDate(thirdMonth, 15); // Vence el 15 del segundo mes posterior

    default:
      // Para cualquier otro número de días, simplemente los sumamos
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
