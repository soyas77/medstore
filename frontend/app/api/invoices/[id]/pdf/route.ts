import { invoices } from "@/app/api/_mock/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";

/**
 * Mock "PDF" endpoint. A real backend returns application/pdf; for the demo we
 * return a self-contained printable HTML document so the <iframe> preview and
 * "Download" link both work without a PDF toolchain.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const inv = invoices.find((i) => i.id === Number(params.id));
  if (!inv) {
    return new Response("Invoice not found", { status: 404 });
  }

  const rows = inv.items
    .map(
      (it) => `
      <tr>
        <td>${it.medicine_name}<div class="muted">${it.manufacturer}</div></td>
        <td class="num">${it.quantity}</td>
        <td class="num">${formatCurrency(it.unit_price)}</td>
        <td class="num">${it.discount_rate ? (it.discount_rate * 100).toFixed(0) + "%" : "—"}</td>
        <td class="num">${formatCurrency(it.line_total)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>${inv.invoice_number}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;margin:0;padding:32px;color:#0f172a;background:#fff}
  h1{margin:0;font-size:22px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:24px}
  .brand{font-weight:700;font-size:20px;color:#0d9488}
  .muted{color:#64748b;font-size:12px}
  .meta div{margin:2px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}
  th{background:#f1f5f9;text-transform:uppercase;font-size:11px;letter-spacing:.04em}
  .num{text-align:right}
  .totals{margin-top:24px;margin-left:auto;width:300px}
  .totals div{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
  .grand{border-top:2px solid #0f172a;font-weight:700;font-size:16px;margin-top:6px;padding-top:10px}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#ccfbf1;color:#0f766e}
  @media print{body{padding:0}}
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">MedStore</div>
      <div class="muted">Wholesale Pharmacy Management</div>
    </div>
    <div class="meta" style="text-align:right">
      <h1>${inv.type === "sale" ? "Sales Invoice" : "Restock Invoice"}</h1>
      <div><strong>${inv.invoice_number}</strong></div>
      <div class="muted">${formatDateTime(inv.created_at)}</div>
      <div><span class="badge">${inv.type.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="meta">
    <div><strong>Issued by:</strong> ${inv.user_name}</div>
    ${inv.customer_name ? `<div><strong>Customer:</strong> ${inv.customer_name}</div>` : ""}
    ${inv.supplier_name ? `<div><strong>Supplier:</strong> ${inv.supplier_name}</div>` : ""}
  </div>

  <table>
    <thead><tr>
      <th>Item</th><th class="num">Qty</th><th class="num">Unit</th>
      <th class="num">Disc</th><th class="num">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span></div>
    <div><span>Discount</span><span>- ${formatCurrency(inv.discount_total)}</span></div>
    <div class="grand"><span>Grand Total</span><span>${formatCurrency(inv.grand_total)}</span></div>
  </div>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.html"`,
    },
  });
}
