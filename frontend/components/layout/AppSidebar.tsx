"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/components/layout/nav-config";
import type { UserRole } from "@/types/api";

interface AppSidebarProps {
  role: UserRole | undefined;
  /** Called when a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function AppSidebar({ role, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Pill className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold">MedStore</p>
          <p className="text-[11px] text-muted-foreground">Wholesale Pharmacy</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-thin">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 text-[11px] text-muted-foreground">
        <p>MedStore v1.0.0</p>
        <p>© {new Date().getFullYear()} MedStore Inc.</p>
      </div>
    </div>
  );
}
