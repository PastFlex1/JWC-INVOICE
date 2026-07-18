import { InvoiceDetailClient } from './invoice-detail-client';

type InvoiceDetailPageProps = {
<<<<<<< HEAD
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = await params;
  return <InvoiceDetailClient invoiceId={resolvedParams.id} />;
=======
  params: {
    id: string;
  };
};

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  return <InvoiceDetailClient invoiceId={params.id} />;
>>>>>>> origin/main
}
