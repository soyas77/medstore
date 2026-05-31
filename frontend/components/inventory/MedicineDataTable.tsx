"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditMedicineDrawer } from "./EditMedicineDrawer";
import {
  MedicineListParams,
  useDeleteMedicine,
  useMedicines,
} from "@/hooks/useMedicines";
import { cn, formatCurrency } from "@/lib/utils";
import type { Medicine } from "@/types/api";

const PAGE_SIZE = 10;

export function MedicineDataTable() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "id", desc: false },
  ]);

  const [editTarget, setEditTarget] = React.useState<Medicine | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Medicine | null>(null);

  const deleteMedicine = useDeleteMedicine();

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params: MedicineListParams = {
    search: debounced,
    page,
    pageSize: PAGE_SIZE,
    sortBy: sorting[0]?.id ?? "id",
    sortDir: sorting[0]?.desc ? "desc" : "asc",
  };
  const { data, isLoading, isFetching } = useMedicines(params);

  const columns = React.useMemo<ColumnDef<Medicine>[]>(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row }) => `#${row.original.id}` },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "manufacturer", header: "Manufacturer" },
      {
        accessorKey: "price_per_strip",
        header: "Price/Strip",
        cell: ({ row }) => formatCurrency(row.original.price_per_strip),
      },
      {
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const m = row.original;
          const low = m.stock <= m.low_stock_threshold;
          return (
            <div className="flex items-center gap-2">
              <span>{m.stock}</span>
              {low && (
                <Badge variant="destructive" className="text-[10px]">
                  {m.stock === 0 ? "OUT" : "LOW"}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditTarget(row.original)}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.original)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortableIds = new Set([
    "id",
    "name",
    "manufacturer",
    "price_per_strip",
    "stock",
  ]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, manufacturer or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = sortableIds.has(header.column.id);
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.id === "actions" && "text-right",
                        canSort && "cursor-pointer select-none"
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const m = row.original;
                const low = m.stock <= m.low_stock_threshold;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      low &&
                        "bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/10"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.id === "actions" && "text-right",
                          low &&
                            (cell.column.id === "name" ||
                              cell.column.id === "stock") &&
                            "font-medium text-destructive"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No medicines found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} medicine{total === 1 ? "" : "s"}
          {isFetching && " · updating…"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditMedicineDrawer
        medicine={editTarget}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete medicine?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              from inventory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMedicine.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMedicine.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {deleteMedicine.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
