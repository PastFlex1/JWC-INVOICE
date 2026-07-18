
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, useMemo } from 'react';
import type { Pais, Vendedor, Customer, Finca, Carguera, Consignatario, Dae, Marcacion, Provincia, Invoice, Producto, CreditNote, DebitNote, Payment, Variedad } from '@/lib/types';
import { getPaises, subscribePaises } from '@/services/paises';
import { getVendedores, subscribeVendedores } from '@/services/vendedores';
import { getCustomers, subscribeCustomers } from '@/services/customers';
import { getFincas, subscribeFincas } from '@/services/fincas';
import { getCargueras, subscribeCargueras } from '@/services/cargueras';
import { getConsignatarios, subscribeConsignatarios } from '@/services/consignatarios';
import { getDaes, subscribeDaes } from '@/services/daes';
import { getMarcaciones, subscribeMarcaciones } from '@/services/marcaciones';
import { getProvincias, subscribeProvincias } from '@/services/provincias';
import { getInvoices, subscribeInvoices } from '@/services/invoices';
import { getProductos, subscribeProductos } from '@/services/productos';
import { getCreditNotes, subscribeCreditNotes } from '@/services/credit-notes';
import { getDebitNotes, subscribeDebitNotes } from '@/services/debit-notes';
import { getPayments, subscribePayments } from '@/services/payments';
import { getVariedades, subscribeVariedades } from '@/services/variedades';
import { cargueras as defaultCargueras, provincias as defaultProvincias } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { getInvoiceStatus } from '@/lib/due-date';
import { parseISO } from 'date-fns';
import { useAuth } from '@/context/auth-context';

type AppData = {
  paises: Pais[];
  vendedores: Vendedor[];
  customers: Customer[];
  fincas: Finca[];
  cargueras: Carguera[];
  consignatarios: Consignatario[];
  daes: Dae[];
  marcaciones: Marcacion[];
  provincias: Provincia[];
  invoices: Invoice[];
  productos: Producto[];
  variedades: Variedad[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  payments: Payment[];
};

type AppDataContextType = AppData & {
  isLoading: boolean;
  hasBeenLoaded: boolean;
  refreshData: () => Promise<void>;
  hydrateData: (initialData: Partial<AppData>) => void;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    paises: [],
    vendedores: [],
    customers: [],
    fincas: [],
    cargueras: defaultCargueras,
    consignatarios: [],
    daes: [],
    marcaciones: [],
    provincias: defaultProvincias,
    invoices: [],
    productos: [],
    variedades: [],
    creditNotes: [],
    debitNotes: [],
    payments: [],
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasBeenLoaded, setHasBeenLoaded] = useState(false);
  const [loadedCollections, setLoadedCollections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setData({
        paises: [],
        vendedores: [],
        customers: [],
        fincas: [],
        cargueras: defaultCargueras,
        consignatarios: [],
        daes: [],
        marcaciones: [],
        provincias: defaultProvincias,
        invoices: [],
        productos: [],
        variedades: [],
        creditNotes: [],
        debitNotes: [],
        payments: [],
      });
      setHasBeenLoaded(false);
      setIsLoading(false);
      setLoadedCollections({});
      return;
    }

    setIsLoading(true);

    const checkAllLoaded = (updatedLoaded: Record<string, boolean>) => {
      const allKeys = [
        'paises', 'vendedores', 'customers', 'fincas', 'cargueras',
        'consignatarios', 'daes', 'marcaciones', 'provincias',
        'invoices', 'productos', 'variedades', 'creditNotes',
        'debitNotes', 'payments'
      ];
      const allDone = allKeys.every(k => updatedLoaded[k]);
      if (allDone) {
        setIsLoading(false);
        setHasBeenLoaded(true);
      }
    };

    const updateCollection = (key: keyof AppData, loadedKey: string, items: any) => {
      setData(prev => ({ ...prev, [key]: items }));
      setLoadedCollections(prev => {
        const next = { ...prev, [loadedKey]: true };
        checkAllLoaded(next);
        return next;
      });
    };

    const unsubscribes = [
      subscribePaises((items) => updateCollection('paises', 'paises', items)),
      subscribeVendedores((items) => updateCollection('vendedores', 'vendedores', items)),
      subscribeCustomers((items) => updateCollection('customers', 'customers', items)),
      subscribeFincas((items) => updateCollection('fincas', 'fincas', items)),
      subscribeCargueras((items) => {
        const dbCarguerasNames = new Set(items.map(c => c.nombreCarguera.toLowerCase()));
        const combinedCargueras = [...items];
        defaultCargueras.forEach(dc => {
          if (!dbCarguerasNames.has(dc.nombreCarguera.toLowerCase())) {
            combinedCargueras.push(dc);
          }
        });
        updateCollection('cargueras', 'cargueras', combinedCargueras);
      }),
      subscribeConsignatarios((items) => updateCollection('consignatarios', 'consignatarios', items)),
      subscribeDaes((items) => updateCollection('daes', 'daes', items)),
      subscribeMarcaciones((items) => updateCollection('marcaciones', 'marcaciones', items)),
      subscribeProvincias((items) => {
        const dbProvinciasNames = new Set(items.map(p => p.nombre.toLowerCase()));
        const combinedProvincias = [...items];
        defaultProvincias.forEach(dp => {
          if (!dbProvinciasNames.has(dp.nombre.toLowerCase())) {
            combinedProvincias.push(dp);
          }
        });
        updateCollection('provincias', 'provincias', combinedProvincias);
      }),
      subscribeInvoices((items) => updateCollection('invoices', 'invoices', items)),
      subscribeProductos((items) => updateCollection('productos', 'productos', items)),
      subscribeVariedades((items) => updateCollection('variedades', 'variedades', items)),
      subscribeCreditNotes((items) => updateCollection('creditNotes', 'creditNotes', items)),
      subscribeDebitNotes((items) => updateCollection('debitNotes', 'debitNotes', items)),
      subscribePayments((items) => updateCollection('payments', 'payments', items)),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isAuthenticated]);

  const processedInvoices = useMemo(() => {
    const customerMap = new Map(data.customers.map(c => [c.id, c]));
    return data.invoices.map(invoice => {
      const customer = customerMap.get(invoice.customerId);

      const calculateBalance = (type: 'sale' | 'purchase') => {
        if (invoice.type !== type && invoice.type !== 'both') return 0;
        
        const priceField = type === 'sale' ? 'salePrice' : 'purchasePrice';
        const subtotal = invoice.items.reduce((acc, item) => {
          return acc + (item.bunches || []).reduce((bunchAcc, bunch) => {
            const productLower = (bunch.product || '').toLowerCase();
            const isGyp = productLower.includes('gyp');
            const numBoxes = item.numberOfBoxes || 1;
            const price = bunch[priceField] || 0;
            
            if (isGyp) {
              return bunchAcc + (bunch.bunchesPerBox * numBoxes * price);
            }
            const stems = bunch.stemsPerBunch * bunch.bunchesPerBox * numBoxes;
            return bunchAcc + (stems * price);
          }, 0);
        }, 0);

        const credits = data.creditNotes.filter(cn => cn.invoiceId === invoice.id && cn.type === type).reduce((sum, note) => sum + note.amount, 0);
        const debits = data.debitNotes.filter(dn => dn.invoiceId === invoice.id && dn.type === type).reduce((sum, note) => sum + note.amount, 0);
        const paid = data.payments.filter(p => p.invoiceId === invoice.id && p.type === type).reduce((sum, payment) => sum + payment.amount, 0);
        
        return (subtotal + debits) - (credits + paid);
      };

      const saleBalance = calculateBalance('sale');
      const purchaseBalance = calculateBalance('purchase');

      const saleStatus: Invoice['saleStatus'] = invoice.type === 'purchase' ? 'N/A' : getInvoiceStatus(parseISO(invoice.farmDepartureDate), saleBalance, customer || null);
      const purchaseStatus: Invoice['purchaseStatus'] = invoice.type === 'sale' ? 'N/A' : getInvoiceStatus(parseISO(invoice.farmDepartureDate), purchaseBalance, customer || null);

      return {
        ...invoice,
        saleStatus,
        purchaseStatus,
      };
    });
  }, [data.invoices, data.customers, data.creditNotes, data.debitNotes, data.payments]);

  const hydrateData = useCallback((initialData: Partial<AppData>) => {
    setData(prevData => ({ ...prevData, ...initialData }));
    setHasBeenLoaded(true);
    setIsLoading(false);
  }, []);

  const value = useMemo(() => ({
    ...data,
    invoices: processedInvoices,
    isLoading,
    hasBeenLoaded,
    refreshData: () => Promise.resolve(),
    hydrateData,
  }), [data, processedInvoices, isLoading, hasBeenLoaded, hydrateData]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
