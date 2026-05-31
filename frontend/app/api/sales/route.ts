import { NextResponse } from "next/server";
import {
  invoices,
  medicines,
  nextInvoiceId,
  round,
  settings,
} from "@/app/api/_mock/db";
import { badRequest, getAuthUser, unauthorized } from "@/app/api/_mock/helpers";
import type { InvoiceDetail, InvoiceLineItem, SaleCreate } from "@/types/api";

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => null)) as SaleCreate | null;
  if (!body?.items?.length) return badRequest("Sale must contain items");

  const items: InvoiceLineItem[] = [];
  for (const [idx, line] of body.items.entries()) {
    const med = medicines.find((m) => m.id === line.medicine_id);
    if (!med) return badRequest(`Medicine ${line.medicine_id} not found`);
    if (line.quantity <= 0) return badRequest("Quantity must be positive");
    if (line.quantity > med.stock) {
      return badRequest(`Insufficient stock for ${med.name}`);
    }
    const rate = line.quantity >= settings.discount_min_qty ? settings.default_discount_rate : 0;
    const gross = line.quantity * med.price_per_strip;
    const discount = round(gross * rate);
    items.push({
      id: idx + 1,
      medicine_id: med.id,
      medicine_name: med.name,
      manufacturer: med.manufacturer,
      quantity: line.quantity,
      unit_price: med.price_per_strip,
      discount_rate: rate,
      discount_amount: discount,
      line_total: round(gross - discount),
    });
  }

  // Decrement stock.
  for (const line of body.items) {
    const med = medicines.find((m) => m.id === line.medicine_id)!;
    med.stock -= line.quantity;
    med.updated_at = new Date().toISOString();
  }

  const subtotal = round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0));
  const discount_total = round(items.reduce((s, i) => s + i.discount_amount, 0));
  const grand_total = round(subtotal - discount_total);
  const id = nextInvoiceId();
  const now = new Date();

  const invoice: InvoiceDetail = {
    id,
    invoice_number: `INV-${now.getFullYear()}-${String(id).padStart(5, "0")}`,
    type: "sale",
    user_id: user.id,
    user_name: user.full_name,
    customer_name: body.customer_name ?? null,
    supplier_name: null,
    subtotal,
    discount_total,
    grand_total,
    pdf_url: `/api/invoices/${id}/pdf`,
    created_at: now.toISOString(),
    items,
  };
  invoices.unshift(invoice);
  return NextResponse.json(invoice, { status: 201 });
}
