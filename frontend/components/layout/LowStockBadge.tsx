"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useLowStock } from "@/hooks/useMedicines";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

/**
 * LowStockBadge — notification bell that polls /api/medicines/low-stock every
 * 60s (handled inside useLowStock) and surfaces the count + a dropdown list.
 */
export function LowStockBadge() {
  const { data = [], isLoading } = useLowStock({ pollMs: 60_000 });
  const count = data.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${count} low-stock medicines`}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Low stock alerts</span>
          {count > 0 && <Badge variant="destructive">{count}</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Checking stock…
          </div>
        ) : count === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            All medicines are well stocked 🎉
          </div>
        ) : (
          <div className="max-h-72 overflow-auto scroll-thin">
            {data.slice(0, 8).map((m) => (
              <DropdownMenuItem key={m.id} asChild>
                <Link href="/inventory" className="flex flex-col items-start">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.manufacturer} · {m.stock} left (min{" "}
                    {m.low_stock_threshold})
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/inventory"
            className="justify-center text-sm font-medium text-primary"
          >
            View inventory
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
