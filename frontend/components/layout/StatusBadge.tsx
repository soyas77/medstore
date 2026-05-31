import { Badge } from "@/components/ui/badge";
import type { InvoiceType } from "@/types/api";

export function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  return (
    <Badge
      variant={type === "sale" ? "success" : "warning"}
      className="capitalize"
    >
      {type}
    </Badge>
  );
}
