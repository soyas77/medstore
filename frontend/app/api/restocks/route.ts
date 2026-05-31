import { NextResponse } from "next/server";
import { invoices, medicines, nextInvoiceId, round } from "@/app/api/_mock/db";
import {
  badRequest,
  forbidden,
  getAuthUser,
  unauthorized,
} from "@/app/api/_mock/helpers";
import type {
  InvoiceDetail,
  InvoiceLineItem,
  RestockCreate,
} from "@/types/api";

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as RestockCreate | null;
  if (!body?.items?.length) return badRequest("Restock must contain items");

  const items: InvoiceLineItem[] = [];
  for (const [idx, line] of body.items.entries()) {
    const med = medicines.find((m) => m.id === line.medicine_id);
    if (!med) return badRequest(`Medicine ${line.medicine_id} not found`);
    if (line.quantity <= 0) return badRequest("Quantity must be positive");
    items.push({
      id: idx + 1,
      medicine_id: med.id,
      medicine_name: med.name,
      manufacturer: med.manufacturer,
      quantity: line.quantity,
      unit_price: line.unit_cost,
      discount_rate: 0,
      discount_amount: 0,
      line_total: round(line.quantity * line.unit_cost),
    });
  }

  // Increment stock.
  for (const line of body.items) {
    const med = medicines.find((m) => m.id === line.medicine_id)!;
    med.stock += line.quantity;
    med.updated_at = new Date().toISOString();
  }

  const subtotal = round(items.reduce((s, i) => s + i.line_total, 0));
  const id = nextInvoiceId();
  const now = new Date();

  const invoice: InvoiceDetail = {
    id,
    invoice_number: `RST-${now.getFullYear()}-${String(id).padStart(5, "0")}`,
    type: "restock",
    user_id: user.id,
    user_name: user.full_name,
    customer_name: null,
    supplier_name: body.supplier_name ?? null,
    subtotal,
    discount_total: 0,
    grand_total: subtotal,
    pdf_url: `/api/invoices/${id}/pdf`,
    created_at: now.toISOString(),
    items,
  };
  invoices.unshift(invoice);
  return NextResponse.json(invoice, { status: 201 });
}
