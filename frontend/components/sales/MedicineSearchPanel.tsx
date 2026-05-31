"use client";

import * as React from "react";
import { Loader2, PackageSearch, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMedicineSearch } from "@/hooks/useMedicines";
import { cn, formatCurrency } from "@/lib/utils";
import type { Medicine } from "@/types/api";

interface MedicineSearchPanelProps {
  onPick: (m: Medicine) => void;
  /** When true, out-of-stock items are disabled (sales). */
  disableOutOfStock?: boolean;
  title?: string;
}

export function MedicineSearchPanel({
  onPick,
  disableOutOfStock = true,
  title = "Add items",
}: MedicineSearchPanelProps) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data = [], isLoading, isFetching } = useMedicineSearch(debounced);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search medicines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto scroll-thin p-3 pt-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <PackageSearch className="h-8 w-8" />
            No medicines match your search.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {data.map((m) => {
              const out = m.stock <= 0;
              const low = m.stock <= m.low_stock_threshold && !out;
              const disabled = disableOutOfStock && out;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(m)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:border-primary hover:bg-accent"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.manufacturer} · {formatCurrency(m.price_per_strip)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {out ? (
                        <Badge variant="destructive" className="text-[10px]">
                          OUT
                        </Badge>
                      ) : low ? (
                        <Badge variant="warning" className="text-[10px]">
                          {m.stock} left
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {m.stock} in stock
                        </span>
                      )}
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {isFetching && !isLoading && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Updating…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
