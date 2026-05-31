import { create } from "zustand";
import {
  DISCOUNT_MIN_QTY,
  DISCOUNT_RATE,
  computeLineDiscountRate,
} from "@/lib/utils";
import type { Medicine } from "@/types/api";

export interface CartLine {
  medicine_id: number;
  name: string;
  manufacturer: string;
  unit_price: number;
  quantity: number;
  /** Max addable, equals current stock */
  stock: number;
}

export interface CartLineComputed extends CartLine {
  discount_rate: number;
  discount_amount: number;
  gross: number;
  line_total: number;
}

interface CartState {
  /** When true, discount logic applies (sales). For restocks, set false. */
  applyDiscount: boolean;
  lines: CartLine[];
  setApplyDiscount: (v: boolean) => void;
  addMedicine: (m: Medicine) => void;
  setQuantity: (medicineId: number, quantity: number) => void;
  increment: (medicineId: number) => void;
  decrement: (medicineId: number) => void;
  removeLine: (medicineId: number) => void;
  setUnitPrice: (medicineId: number, price: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  applyDiscount: true,
  lines: [],
  setApplyDiscount: (v) => set({ applyDiscount: v }),
  addMedicine: (m) =>
    set((state) => {
      const existing = state.lines.find((l) => l.medicine_id === m.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.medicine_id === m.id
              ? { ...l, quantity: Math.min(l.quantity + 1, Math.max(1, m.stock)) }
              : l
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            medicine_id: m.id,
            name: m.name,
            manufacturer: m.manufacturer,
            unit_price: m.price_per_strip,
            quantity: 1,
            stock: m.stock,
          },
        ],
      };
    }),
  setQuantity: (medicineId, quantity) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.medicine_id === medicineId
          ? { ...l, quantity: Math.max(1, quantity) }
          : l
      ),
    })),
  increment: (medicineId) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.medicine_id === medicineId
          ? { ...l, quantity: l.quantity + 1 }
          : l
      ),
    })),
  decrement: (medicineId) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.medicine_id === medicineId
          ? { ...l, quantity: Math.max(1, l.quantity - 1) }
          : l
      ),
    })),
  removeLine: (medicineId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.medicine_id !== medicineId),
    })),
  setUnitPrice: (medicineId, price) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.medicine_id === medicineId
          ? { ...l, unit_price: Math.max(0, price) }
          : l
      ),
    })),
  clear: () => set({ lines: [] }),
}));

/* --------------------------- Derived selectors --------------------------- */

export function computeLine(
  line: CartLine,
  applyDiscount: boolean
): CartLineComputed {
  const gross = line.quantity * line.unit_price;
  const rate = applyDiscount ? computeLineDiscountRate(line.quantity) : 0;
  const discount_amount = Math.round(gross * rate * 100) / 100;
  return {
    ...line,
    discount_rate: rate,
    discount_amount,
    gross: Math.round(gross * 100) / 100,
    line_total: Math.round((gross - discount_amount) * 100) / 100,
  };
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  grandTotal: number;
  itemCount: number;
}

export function computeTotals(
  lines: CartLine[],
  applyDiscount: boolean
): CartTotals {
  let subtotal = 0;
  let discount = 0;
  let itemCount = 0;
  for (const l of lines) {
    const c = computeLine(l, applyDiscount);
    subtotal += c.gross;
    discount += c.discount_amount;
    itemCount += l.quantity;
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    grandTotal: Math.round((subtotal - discount) * 100) / 100,
    itemCount,
  };
}

export const CART_DISCOUNT_MIN_QTY = DISCOUNT_MIN_QTY;
export const CART_DISCOUNT_RATE = DISCOUNT_RATE;
