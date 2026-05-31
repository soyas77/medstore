/**
 * types/api.ts
 * TypeScript mirror of the backend (FastAPI/Pydantic) schemas.
 * Keep field names snake_case to match the API payloads exactly.
 */

/* ---------------------------------- Auth ---------------------------------- */

export type UserRole = "admin" | "cashier";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO 8601
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface InviteUserRequest {
  email: string;
  full_name: string;
  role: UserRole;
}

/* ------------------------------- Medicines -------------------------------- */

export interface Medicine {
  id: number;
  name: string;
  manufacturer: string;
  /** Selling price per strip in minor display currency (e.g. NPR). */
  price_per_strip: number;
  /** Quantity in stock, measured in strips. */
  stock: number;
  /** Threshold at or below which the medicine is flagged low-stock. */
  low_stock_threshold: number;
  batch_number: string | null;
  expiry_date: string | null; // ISO date
  created_at: string;
  updated_at: string;
}

export interface MedicineCreate {
  name: string;
  manufacturer: string;
  price_per_strip: number;
  stock: number;
  low_stock_threshold: number;
  batch_number?: string | null;
  expiry_date?: string | null;
}

export type MedicineUpdate = Partial<MedicineCreate>;

export interface PaginatedMedicines {
  items: Medicine[];
  total: number;
  page: number;
  page_size: number;
}

/* --------------------------------- Sales ---------------------------------- */

export interface SaleLineItemInput {
  medicine_id: number;
  quantity: number;
}

export interface SaleCreate {
  customer_name?: string | null;
  items: SaleLineItemInput[];
}

export interface InvoiceLineItem {
  id: number;
  medicine_id: number;
  medicine_name: string;
  manufacturer: string;
  quantity: number;
  unit_price: number;
  /** Per-line discount rate, e.g. 0.05 for 5% */
  discount_rate: number;
  discount_amount: number;
  line_total: number;
}

/* ------------------------------- Restocks --------------------------------- */

export interface RestockLineItemInput {
  medicine_id: number;
  quantity: number;
  unit_cost: number;
}

export interface RestockCreate {
  supplier_name?: string | null;
  items: RestockLineItemInput[];
}

/* -------------------------------- Invoices -------------------------------- */

export type InvoiceType = "sale" | "restock";

export interface Invoice {
  id: number;
  invoice_number: string;
  type: InvoiceType;
  user_id: number;
  user_name: string;
  customer_name: string | null;
  supplier_name: string | null;
  subtotal: number;
  discount_total: number;
  grand_total: number;
  pdf_url: string;
  created_at: string;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceLineItem[];
}

export interface PaginatedInvoices {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
}

export interface InvoiceFilters {
  date_from?: string;
  date_to?: string;
  type?: InvoiceType | "all";
  user_id?: number | "all";
  page?: number;
  page_size?: number;
}

/* ------------------------------- Dashboard -------------------------------- */

export interface DashboardStats {
  today_revenue: number;
  today_transactions: number;
  low_stock_count: number;
  total_inventory_value: number;
  revenue_change_pct: number;
  transactions_change_pct: number;
}

export interface SalesTrendPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  transactions: number;
}

/* -------------------------------- Settings -------------------------------- */

export interface BusinessSettings {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  default_low_stock_threshold: number;
  default_discount_rate: number;
  discount_min_qty: number;
}

/* --------------------------------- Errors --------------------------------- */

export interface ApiError {
  detail: string;
}
