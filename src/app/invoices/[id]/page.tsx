import { InvoiceDetailClient } from './invoice-detail-client';

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = await params;
  return <InvoiceDetailClient invoiceId={resolvedParams.id} />;
}
