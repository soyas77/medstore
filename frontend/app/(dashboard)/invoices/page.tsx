"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";

export default function InvoicesPage() {
  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Browse, filter and download sales & restock invoices."
      />
      <InvoiceTable />
    </div>
  );
}
