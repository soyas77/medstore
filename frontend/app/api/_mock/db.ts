/**
 * app/api/_mock/db.ts
 * In-memory mock database for the bundled Next.js route handlers.
 * Persisted on the module scope (resets on server restart). Good enough to
 * demo the full UI without a real backend. Toggle via NEXT_PUBLIC_USE_MOCK_API.
 */

import type {
  BusinessSettings,
  Invoice,
  InvoiceDetail,
  InvoiceLineItem,
  Medicine,
  User,
} from "@/types/api";

export const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME ?? "medstore_token";
export const ROLE_COOKIE = "medstore_role";

/* --------------------------------- Users ---------------------------------- */

export interface MockUser extends User {
  password: string;
}

export const users: MockUser[] = [
  {
    id: 1,
    email: "admin@medstore.test",
    full_name: "Asha Admin",
    role: "admin",
    is_active: true,
    created_at: "2025-01-10T09:00:00Z",
    password: "admin123",
  },
  {
    id: 2,
    email: "cashier@medstore.test",
    full_name: "Kabir Cashier",
    role: "cashier",
    is_active: true,
    created_at: "2025-02-15T09:00:00Z",
    password: "cashier123",
  },
];

/* ------------------------------- Medicines -------------------------------- */

const MANUFACTURERS = [
  "Cipla",
  "Sun Pharma",
  "Dr. Reddy's",
  "Lupin",
  "GSK",
  "Pfizer",
  "Mankind",
  "Zydus",
];

const NAMES = [
  "Paracetamol 500mg",
  "Amoxicillin 250mg",
  "Azithromycin 500mg",
  "Cetirizine 10mg",
  "Ibuprofen 400mg",
  "Omeprazole 20mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Atorvastatin 10mg",
  "Pantoprazole 40mg",
  "Losartan 50mg",
  "Aspirin 75mg",
  "Diclofenac 50mg",
  "Ranitidine 150mg",
  "Levocetirizine 5mg",
  "Montelukast 10mg",
  "Clopidogrel 75mg",
  "Telmisartan 40mg",
  "Glimepiride 2mg",
  "Rosuvastatin 10mg",
  "Doxycycline 100mg",
  "Ciprofloxacin 500mg",
  "Ondansetron 4mg",
  "Domperidone 10mg",
];

function seedMedicines(): Medicine[] {
  return NAMES.map((name, i) => {
    const stock = [3, 8, 0, 120, 45, 6, 200, 15][i % 8];
    const threshold = 10;
    const now = new Date().toISOString();
    return {
      id: i + 1,
      name,
      manufacturer: MANUFACTURERS[i % MANUFACTURERS.length],
      price_per_strip: Math.round((20 + Math.random() * 180) * 100) / 100,
      stock,
      low_stock_threshold: threshold,
      batch_number: `B${2025}${String(i + 1).padStart(4, "0")}`,
      expiry_date: `2026-${String((i % 12) + 1).padStart(2, "0")}-28`,
      created_at: now,
      updated_at: now,
    };
  });
}

export const medicines: Medicine[] = seedMedicines();

/* -------------------------------- Invoices -------------------------------- */

export const invoices: InvoiceDetail[] = seedInvoices();

function seedInvoices(): InvoiceDetail[] {
  const out: InvoiceDetail[] = [];
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    const count = 2 + ((d * 3) % 4);
    for (let n = 0; n < count; n++) {
      const id = out.length + 1;
      const isSale = (id + d) % 4 !== 0;
      const picks = pickMedicines(2 + (id % 3));
      const items: InvoiceLineItem[] = picks.map((m, idx) => {
        const qty = 1 + ((id + idx) % 4);
        const rate = isSale && qty >= 2 ? 0.05 : 0;
        const gross = qty * m.price_per_strip;
        const discount = Math.round(gross * rate * 100) / 100;
        return {
          id: idx + 1,
          medicine_id: m.id,
          medicine_name: m.name,
          manufacturer: m.manufacturer,
          quantity: qty,
          unit_price: m.price_per_strip,
          discount_rate: rate,
          discount_amount: discount,
          line_total: Math.round((gross - discount) * 100) / 100,
        };
      });
      const subtotal = round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0));
      const discount_total = round(items.reduce((s, i) => s + i.discount_amount, 0));
      const grand_total = round(subtotal - discount_total);
      const user = isSale ? users[1] : users[0];
      const createdAt = new Date(day);
      createdAt.setHours(10 + n, 15 * (n % 4), 0, 0);
      out.push({
        id,
        invoice_number: `${isSale ? "INV" : "RST"}-${createdAt.getFullYear()}-${String(id).padStart(5, "0")}`,
        type: isSale ? "sale" : "restock",
        user_id: user.id,
        user_name: user.full_name,
        customer_name: isSale ? `Customer ${id}` : null,
        supplier_name: isSale ? null : `Supplier ${id}`,
        subtotal,
        discount_total,
        grand_total,
        pdf_url: `/api/invoices/${id}/pdf`,
        created_at: createdAt.toISOString(),
        items,
      });
    }
  }
  return out.sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );
}

function pickMedicines(n: number): Medicine[] {
  const shuffled = [...medicines].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/* -------------------------------- Settings -------------------------------- */

export const settings: BusinessSettings = {
  business_name: "MedStore Wholesale Pvt. Ltd.",
  address: "12 Pharma Lane, Kathmandu, Nepal",
  phone: "+977-1-4000000",
  email: "billing@medstore.test",
  tax_id: "PAN-123456789",
  default_low_stock_threshold: 10,
  default_discount_rate: 0.05,
  discount_min_qty: 2,
};

/* --------------------------------- Tokens --------------------------------- */

/** Opaque "JWT" for mock mode: base64 of the user id + role. */
export function makeToken(user: User): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, role: user.role, email: user.email })
  ).toString("base64url");
  return `mock.${payload}.sig`;
}

export function parseToken(token: string | undefined | null): {
  sub: number;
  role: string;
  email: string;
} | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function nextInvoiceId(): number {
  return invoices.reduce((max, i) => Math.max(max, i.id), 0) + 1;
}

export function nextMedicineId(): number {
  return medicines.reduce((max, m) => Math.max(max, m.id), 0) + 1;
}

export function nextUserId(): number {
  return users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
}
