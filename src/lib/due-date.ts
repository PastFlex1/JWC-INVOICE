'use client';

import type { Customer } from './types';
import { add, setDate, endOfMonth, startOfDay, isPast } from 'date-fns';

export function calculateDueDate(invoiceDate: Date, customer: Customer | null): Date {
  // National customers and prepay international customers have immediate due dates.
  if (!customer || customer.type === 'National') {
    return invoiceDate;
  }
  
  const cleanInvoiceDate = startOfDay(invoiceDate);
  const plazoDays = customer.plazo || 0;

  switch (plazoDays) {
    case 0: // Prepago
      return cleanInvoiceDate;
    
    case 8: // 8 días
      return add(cleanInvoiceDate, { days: 8 });

    case 15: // 15 días (quincenal)
      const dayOfMonth = cleanInvoiceDate.getDate();
      if (dayOfMonth <= 15) {
        // Facturas del 1-15, vencen el 30 del mismo mes.
        return setDate(cleanInvoiceDate, 30);
      } else {
        // Facturas del 16 en adelante, vencen el 15 del siguiente mes.
        const nextMonth = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonth, 15);
      }
      
    case 30: // 30 días
        const nextMonthFor30 = add(cleanInvoiceDate, { months: 1 });
        return setDate(nextMonthFor30, 30);
    
    case 45: // 45 días
        const thirdMonth = add(cleanInvoiceDate, { months: 2 });
        return setDate(thirdMonth, 15);

    default:
      // Fallback a la lógica simple si es un plazo no especificado (aunque no debería pasar con el form)
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
