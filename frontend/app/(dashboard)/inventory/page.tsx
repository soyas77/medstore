"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { MedicineDataTable } from "@/components/inventory/MedicineDataTable";
import { AddMedicineDialog } from "@/components/inventory/AddMedicineDialog";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage medicines, stock levels and pricing."
        actions={<AddMedicineDialog />}
      />
      <MedicineDataTable />
    </div>
  );
}
