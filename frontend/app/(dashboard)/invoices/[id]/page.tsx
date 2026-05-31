"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";
import { useInvoice } from "@/hooks/useInvoices";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, isError } = useInvoice(id);

  return (
    <div>
      <PageHeader
        title="Invoice"
        description="Full breakdown and PDF preview."
        actions={
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[480px] lg:col-span-3" />
          <Skeleton className="h-[480px] lg:col-span-2" />
        </div>
      ) : isError || !data ? (
        <div className="py-24 text-center text-muted-foreground">
          Invoice not found.
        </div>
      ) : (
        <InvoiceDetail invoice={data} />
      )}
    </div>
  );
}
