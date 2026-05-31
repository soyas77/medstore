import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PackagePlus,
  ReceiptText,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/api";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. */
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "cashier"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["admin", "cashier"],
  },
  {
    label: "New Sale",
    href: "/sales/new",
    icon: ShoppingCart,
    roles: ["admin", "cashier"],
  },
  {
    label: "New Restock",
    href: "/restocks/new",
    icon: PackagePlus,
    roles: ["admin"],
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: ReceiptText,
    roles: ["admin", "cashier"],
  },
  { label: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

export function navItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
