import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useListIncome, useListExpenses, useGetProfitLoss, useGetCashflowDetail,
  useListBusinessUnits, useListCustomers, useCreateIncome, useCreateExpense, useCreateCustomer,
  useUpdateIncome, useUpdateExpense, useDeleteIncome, useDeleteExpense,
  getListIncomeQueryKey, getListExpensesQueryKey, getListCustomersQueryKey,
  getGetDashboardSummaryQueryKey, getGetDashboardRevenueChartQueryKey,
  getGetDashboardCashflowQueryKey, getGetTopBusinessUnitsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import type { Income, Expense } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatIDR } from "@/lib/utils";
import { parseCSV, buildImportRows, type ImportRow } from "@/lib/finance-import";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Search, Calendar as CalendarIcon, Download, Upload, FileSpreadsheet, ChevronDown, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight, UserPlus, Building2, X, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";

// ── Customer searchable combobox ─────────────────────────────────────────────
type CustomerOption = { id: number; fullName: string; businessName?: string | null };

function CustomerCombobox({
  customers,
  value,
  onChange,
  onAddNew,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (v: string) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = customers.find(c => String(c.id) === value);
  const filtered = search.trim()
    ? customers.filter(c =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (c.businessName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 px-3 text-left"
        >
          {selected ? (
            <span className="truncate flex-1">
              {selected.fullName}
              {selected.businessName && <span className="text-muted-foreground ml-1">· {selected.businessName}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground flex-1 truncate">
              {customers.length === 0 ? "Belum ada customer — tambah dulu" : "Pilih Customer (opsional)"}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ketik nama customer..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && search.trim() ? (
              <CommandEmpty>
                <div className="py-3 text-center text-sm text-muted-foreground space-y-2">
                  <p>Tidak ditemukan: <strong>{search}</strong></p>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onAddNew(); }}
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    + Tambah sebagai customer baru
                  </button>
                </div>
              </CommandEmpty>
            ) : null}
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => { onChange(""); setSearch(""); setOpen(false); }}
                className="text-muted-foreground"
              >
                <Check className={cn("mr-2 h-4 w-4 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                — Tidak ada —
              </CommandItem>
              {filtered.map(c => (
                <CommandItem
                  key={c.id}
                  value={String(c.id)}
                  onSelect={() => { onChange(String(c.id)); setSearch(""); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === String(c.id) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{c.fullName}</span>
                  {c.businessName && (
                    <span className="ml-1 text-xs text-muted-foreground shrink-0">· {c.businessName}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); onAddNew(); }}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              Tambah Customer Baru
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const INCOME_CATEGORIES = ["Service", "Product", "Consultation", "License", "Commission", "Rental", "Other"] as const;
const EXPENSE_CATEGORIES = ["Operational", "Salary", "Marketing", "Equipment", "Office", "Travel", "Tax", "Other"] as const;
const PAYMENT_METHODS = ["Transfer Bank", "Cash", "Cek", "Kartu Kredit", "QRIS"] as const;

// ── CSV / Export helpers ─────────────────────────────────────────────────────
function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => `"${c.label}"`).join(",");
  const body = rows.map(row =>
    columns.map(c => {
      const v = row[c.key] ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [header, ...body].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const INCOME_COLS = [
  { key: "date", label: "Date" },
  { key: "invoiceNumber", label: "Invoice #" },
  { key: "businessUnitName", label: "Business Unit" },
  { key: "customerName", label: "Customer" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (IDR)" },
  { key: "tax", label: "Tax (IDR)" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "status", label: "Status" },
];

const EXPENSE_COLS = [
  { key: "date", label: "Date" },
  { key: "receiptNumber", label: "Receipt #" },
  { key: "businessUnitName", label: "Business Unit" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (IDR)" },
  { key: "tax", label: "Tax (IDR)" },
  { key: "paymentMethod", label: "Payment Method" },
];

function ImportDialog({
  open, onOpenChange, kind, rows, fileName, problem, importing, progress,
  onPickFile, onConfirm, onDownloadTemplate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "income" | "expenses";
  rows: ImportRow[] | null;
  fileName: string;
  problem: string | null;
  importing: boolean;
  progress: number;
  onPickFile: (f: File) => void;
  onConfirm: () => void;
  onDownloadTemplate: () => void;
}) {
  const valid = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalid = rows?.filter((r) => r.errors.length > 0) ?? [];
  const label = kind === "income" ? "Income" : "Expenses";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {label} dari CSV</DialogTitle>
          <DialogDescription>
            Formatnya sama persis dengan hasil Export. Cara paling aman: export dulu,
            edit filenya, lalu import kembali.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Step 1 — pick a file */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pilih berkas CSV</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept=".csv,text/csv"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                  // Reset so picking the same file twice still fires onChange.
                  e.target.value = "";
                }}
                className="h-11 cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              <Button
                variant="outline"
                onClick={onDownloadTemplate}
                disabled={importing}
                className="h-11 w-full shrink-0 transition-transform active:scale-95 sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Belum punya formatnya? Klik <span className="font-medium text-foreground">Template</span> untuk
              mengunduh contoh kolom yang benar.
            </p>
          </div>

          {fileName && !problem && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
              <span className="truncate font-medium">{fileName}</span>
            </div>
          )}

          {problem && (
            <div className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm leading-relaxed">{problem}</p>
            </div>
          )}

          {rows && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <Separator />

              {/* Tally — the two numbers the user actually decides on */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border bg-green-500/5 px-3 py-2.5">
                  <p className="text-2xl font-semibold tabular-nums text-green-600">{valid.length}</p>
                  <p className="text-xs text-muted-foreground">baris siap diimpor</p>
                </div>
                <div className={cn("rounded-md border px-3 py-2.5", invalid.length > 0 && "bg-destructive/5")}>
                  <p className={cn("text-2xl font-semibold tabular-nums", invalid.length > 0 ? "text-destructive" : "text-muted-foreground")}>
                    {invalid.length}
                  </p>
                  <p className="text-xs text-muted-foreground">baris bermasalah</p>
                </div>
              </div>

              {invalid.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Baris bermasalah <span className="font-medium text-foreground">dilewati</span>, tidak
                    menggagalkan yang lain. Nomor baris di bawah sama dengan nomor baris di Excel.
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                        <TableRow>
                          <TableHead className="h-9 w-16 text-xs">Baris</TableHead>
                          <TableHead className="h-9 text-xs">Masalah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invalid.map((r) => (
                          <TableRow key={r.line}>
                            <TableCell className="py-2 font-mono text-xs tabular-nums text-muted-foreground">
                              {r.line}
                            </TableCell>
                            <TableCell className="py-2 text-xs leading-relaxed text-destructive">
                              {r.errors.join(" · ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {importing && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Mengimpor…</span>
                    <span className="font-medium tabular-nums">{progress} / {valid.length}</span>
                  </div>
                  <Progress value={valid.length ? (progress / valid.length) * 100 : 0} className="h-1.5" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
            className="transition-transform active:scale-95"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={importing || valid.length === 0}
            className="min-w-[9.5rem] transition-transform active:scale-95"
          >
            {importing ? (
              <>
                <Spinner className="mr-2" />
                Mengimpor…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {valid.length > 0 ? `${valid.length} baris` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceHub() {
  const [match, params] = useRoute("/finance/:tab?");
  const [location, setLocation] = useLocation();
  const tab = params?.tab || "income";

  // Read ?bu= and ?buName= query params for deep-link from BU detail page
  const qp = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const buFromUrl = qp.get("bu") ?? "";
  const buNameFromUrl = qp.get("buName") ?? "";

  // Shared state for filters
  const [buFilter, setBuFilter] = useState(buFromUrl || "all");
  const [periodFilter, setPeriodFilter] = useState("all_time");

  // Compute date range from period
  function getPeriodDates(period: string): { startDate?: string; endDate?: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    switch (period) {
      case "daily":   return { startDate: fmt(now), endDate: fmt(now) };
      case "weekly":  { const s = new Date(now); s.setDate(s.getDate() - s.getDay()); return { startDate: fmt(s), endDate: fmt(now) }; }
      case "monthly": return { startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, endDate: fmt(now) };
      case "quarterly": { const qs = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return { startDate: fmt(qs), endDate: fmt(now) }; }
      case "yearly":  return { startDate: `${now.getFullYear()}-01-01`, endDate: fmt(now) };
      case "all_time": return {};
      default: return {};
    }
  }
  const { startDate, endDate } = getPeriodDates(periodFilter);
  const [exporting, setExporting] = useState(false);

  const { data: businessUnits } = useListBusinessUnits();
  const { data: allCustomers } = useListCustomers({ limit: 1000 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createIncomeMut = useCreateIncome();
  const createExpenseMut = useCreateExpense();

  // Import lives on the two data tabs only; P&L and cashflow are derived views.
  const importKind: "income" | "expenses" = tab === "expenses" ? "expenses" : "income";
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importProblem, setImportProblem] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  function resetImport() {
    setImportRows(null);
    setImportFileName("");
    setImportProblem(null);
    setImportProgress(0);
  }

  async function handleImportFile(file: File) {
    resetImport();
    setImportFileName(file.name);
    try {
      const grid = parseCSV(await file.text());
      if (grid.length < 2) {
        setImportProblem("File tidak berisi baris data (hanya header atau kosong).");
        return;
      }
      const { rows, missingColumns } = buildImportRows(
        grid,
        importKind,
        (businessUnits ?? []).map((u: any) => ({ id: u.id, name: u.name })),
        (allCustomers?.data ?? []).map((c: any) => ({ id: c.id, name: c.fullName })),
      );
      if (missingColumns.length > 0) {
        setImportProblem(`Kolom wajib tidak ada: ${missingColumns.join(", ")}. Gunakan tombol "Download template".`);
        return;
      }
      setImportRows(rows);
    } catch {
      setImportProblem("File tidak bisa dibaca. Pastikan formatnya .csv");
    }
  }

  async function runImport() {
    if (!importRows) return;
    const valid = importRows.filter((r) => r.errors.length === 0);
    setImporting(true);
    setImportProgress(0);

    const failed: { line: number; reason: string }[] = [];
    // Sequential on purpose: the API creates rows one at a time and a burst of
    // parallel writes would make a partial failure much harder to explain.
    for (let i = 0; i < valid.length; i++) {
      try {
        if (importKind === "income") {
          await createIncomeMut.mutateAsync({ data: valid[i].payload as any });
        } else {
          await createExpenseMut.mutateAsync({ data: valid[i].payload as any });
        }
      } catch (err: any) {
        failed.push({ line: valid[i].line, reason: err?.message ?? "ditolak server" });
      }
      setImportProgress(i + 1);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
    ]);

    setImporting(false);
    const ok = valid.length - failed.length;
    if (failed.length === 0) {
      toast({ title: `${ok} baris berhasil diimpor ✓` });
      setImportOpen(false);
      resetImport();
    } else {
      toast({
        title: `${ok} berhasil, ${failed.length} gagal`,
        description: `Baris gagal: ${failed.slice(0, 5).map((f) => f.line).join(", ")}${failed.length > 5 ? "…" : ""}`,
        variant: "destructive",
      });
    }
  }

  function downloadTemplate() {
    const cols = importKind === "income" ? INCOME_COLS : EXPENSE_COLS;
    downloadCSV(toCSV([], cols), `template_${importKind}.csv`);
    toast({ title: `Template ${importKind} didownload` });
  }

  const handleTabChange = (value: string) => {
    setLocation(`/finance/${value}`);
  };

  async function handleExport(mode: "csv" | "sheets") {
    setExporting(true);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const buParam = buFilter !== "all" ? `&businessUnitId=${buFilter}` : "";
      const isIncome = tab === "income" || tab === "profit-loss" || tab === "cashflow";
      const activeTab = tab === "expenses" ? "expenses" : "income";

      // Fetch data for the active data tab
      let rows: Record<string, unknown>[] = [];
      let cols = INCOME_COLS;
      let filename = "";

      // customFetch, not bare fetch: it attaches the Supabase bearer token.
      // A bare fetch here returns 401 now that the API requires authentication.
      if (tab === "expenses") {
        const json = await customFetch<any>(`${BASE}/api/finance/expenses?limit=5000${buParam}`);
        rows = (json.data ?? json) as Record<string, unknown>[];
        cols = EXPENSE_COLS;
        filename = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        const json = await customFetch<any>(`${BASE}/api/finance/income?limit=5000${buParam}`);
        rows = (json.data ?? json) as Record<string, unknown>[];
        cols = INCOME_COLS;
        filename = `income_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      const csv = toCSV(rows, cols);
      downloadCSV(csv, filename);

      if (mode === "sheets") {
        window.open("https://sheets.new", "_blank");
        toast({
          title: "File CSV didownload & Google Sheets dibuka",
          description: "Di Google Sheets: klik File → Import → Upload, lalu pilih file CSV yang baru didownload.",
        });
      } else {
        toast({ title: `Exported ${rows.length} baris ke ${filename}` });
      }
    } catch {
      toast({ title: "Gagal export", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  function clearBuFilter() {
    setBuFilter("all");
    // Strip query params from current path
    const path = location.split("?")[0];
    setLocation(path);
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Finance Hub</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {buFromUrl && buNameFromUrl
              ? `Transaksi untuk ${buNameFromUrl}`
              : "Manage cashflow, track transactions, and analyze profitability."}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center lg:justify-end">
          {/* Time range filter */}
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full min-w-0 bg-background sm:w-[150px]">
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-full min-w-0 bg-background sm:w-[200px]">
              <SelectValue placeholder="All Business Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Units</SelectItem>
              {businessUnits?.map(bu => (
                <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "Export"}
                <ChevronDown className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer gap-2">
                <Download className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Download CSV</p>
                  <p className="text-xs text-muted-foreground">Simpan sebagai file .csv</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("sheets")} className="cursor-pointer gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <div>
                  <p className="font-medium">Export ke Google Sheets</p>
                  <p className="text-xs text-muted-foreground">Download CSV + buka Sheets</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Only the two data tabs can receive rows; P&L and cashflow are derived. */}
          {(tab === "income" || tab === "expenses") && (
            <Button
              variant="outline"
              onClick={() => { resetImport(); setImportOpen(true); }}
              className="group w-full transition-transform active:scale-95"
            >
              <Upload className="w-4 h-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
              Import
            </Button>
          )}
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport(); }}
        kind={importKind}
        rows={importRows}
        fileName={importFileName}
        problem={importProblem}
        importing={importing}
        progress={importProgress}
        onPickFile={handleImportFile}
        onConfirm={runImport}
        onDownloadTemplate={downloadTemplate}
      />

      {/* BU filter banner — shown when deep-linked from a BU detail card */}
      {buFromUrl && buNameFromUrl && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-3 sm:gap-3 sm:px-4">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="min-w-0 basis-[calc(100%-2rem)] text-sm font-medium text-foreground sm:flex-1 sm:basis-auto">
            Menampilkan transaksi untuk:{" "}
            <span className="font-semibold text-primary">{buNameFromUrl}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBuFilter}
            className="h-8 flex-1 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:flex-none"
          >
            <X className="w-3.5 h-3.5" />
            Tampilkan semua
          </Button>
          <Button variant="outline" size="sm" className="h-8 flex-1 gap-1.5 sm:flex-none" asChild>
            <Link href={`/business-units/${buFromUrl}`}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Link>
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange} className="min-w-0 w-full space-y-5 sm:space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border bg-card p-1 sm:flex sm:justify-start sm:overflow-x-auto">
          <TabsTrigger value="income" className="w-full rounded-md px-3 py-2.5 sm:w-auto sm:px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Income</TabsTrigger>
          <TabsTrigger value="expenses" className="w-full rounded-md px-3 py-2.5 sm:w-auto sm:px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
          <TabsTrigger value="profit-loss" className="w-full rounded-md px-3 py-2.5 sm:w-auto sm:px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cashflow" className="w-full rounded-md px-3 py-2.5 sm:w-auto sm:px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cashflow</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-0 outline-none">
          <IncomeTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} businessUnits={businessUnits ?? []} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0 outline-none">
          <ExpenseTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} businessUnits={businessUnits ?? []} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="profit-loss" className="mt-0 outline-none">
          <ProfitLossTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} />
        </TabsContent>
        <TabsContent value="cashflow" className="mt-0 outline-none">
          <CashflowTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SortDir = "asc" | "desc";

function IncomeTab({ buFilter, businessUnits, startDate, endDate }: { buFilter: number | null; businessUnits: { id: number; name: string }[]; startDate?: string; endDate?: string }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: incomeList, isLoading } = useListIncome({ businessUnitId: buFilter ?? undefined, limit: 10000, startDate: startDate ?? undefined, endDate: endDate ?? undefined });
  const { data: customers } = useListCustomers({ limit: 1000 });
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();
  const createCustomer = useCreateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editItem, setEditItem] = useState<Income | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function openIncomeEdit(item: Income) {
    setEditItem(item);
    setEditForm({
      date: item.date ?? "",
      amount: String(item.amount ?? ""),
      invoiceNumber: item.invoiceNumber ?? "",
      category: item.category ?? "",
      paymentMethod: item.paymentMethod ?? "",
      status: item.status ?? "Received",
      tax: String(item.tax ?? ""),
      description: item.description ?? "",
      businessUnitId: item.businessUnitId ? String(item.businessUnitId) : "",
      customerId: item.customerId ? String(item.customerId) : "",
    });
  }

  function setEF(key: string, value: string) {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleEditSave() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await updateIncome.mutateAsync({
        id: editItem.id,
        data: {
          date: editForm.date || undefined,
          amount: editForm.amount ? parseFloat(editForm.amount) : undefined,
          invoiceNumber: editForm.invoiceNumber || undefined,
          category: editForm.category || undefined,
          paymentMethod: editForm.paymentMethod || undefined,
          status: (editForm.status as any) || undefined,
          tax: editForm.tax ? parseFloat(editForm.tax) : undefined,
          description: editForm.description || undefined,
          businessUnitId: editForm.businessUnitId ? parseInt(editForm.businessUnitId) : undefined,
          customerId: editForm.customerId ? parseInt(editForm.customerId) : undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Income berhasil diperbarui ✓" });
      setEditItem(null);
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteIncome() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await deleteIncome.mutateAsync({ id: editItem.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Income berhasil dihapus" });
      setEditItem(null);
      setDeleteConfirm(false);
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  // Quick-add customer state
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [savingCust, setSavingCust] = useState(false);
  const [custForm, setCustForm] = useState({ fullName: "", businessName: "", phone: "", email: "", status: "Lead" });

  async function handleAddCustomer() {
    if (!custForm.fullName.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSavingCust(true);
    try {
      const newCust = await createCustomer.mutateAsync({
        data: {
          fullName: custForm.fullName,
          businessName: custForm.businessName || undefined,
          phone: custForm.phone || undefined,
          email: custForm.email || undefined,
          status: custForm.status as any,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      // Auto-select the just-created customer
      setF("customerId", String(newCust.id));
      toast({ title: `Customer "${newCust.fullName}" ditambahkan ✓` });
      setCustForm({ fullName: "", businessName: "", phone: "", email: "", status: "Lead" });
      setAddCustOpen(false);
    } catch {
      toast({ title: "Gagal menambahkan customer", variant: "destructive" });
    } finally {
      setSavingCust(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    amount: "",
    businessUnitId: buFilter ? buFilter.toString() : "",
    customerId: "",
    invoiceNumber: "",
    category: "",
    paymentMethod: "",
    status: "Received",
    tax: "",
    description: "",
  });

  function resetForm() {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      amount: "",
      businessUnitId: buFilter ? buFilter.toString() : "",
      customerId: "",
      invoiceNumber: "",
      category: "",
      paymentMethod: "",
      status: "Received",
      tax: "",
      description: "",
    });
  }

  function setF(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.date || !form.amount) {
      toast({ title: "Validasi gagal", description: "Tanggal dan jumlah wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createIncome.mutateAsync({
        data: {
          date: form.date,
          amount: parseFloat(form.amount),
          businessUnitId: form.businessUnitId ? parseInt(form.businessUnitId) : undefined,
          customerId: form.customerId ? parseInt(form.customerId) : undefined,
          invoiceNumber: form.invoiceNumber || undefined,
          category: form.category || undefined,
          paymentMethod: form.paymentMethod || undefined,
          status: (form.status as "Received" | "Pending" | "Cancelled") || "Received",
          tax: form.tax ? parseFloat(form.tax) : undefined,
          description: form.description || undefined,
        },
      });
      // Invalidate income list + all dashboard caches for instant sync
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Income berhasil dicatat ✓" });
      resetForm();
      setIsAddOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan income", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const filtered = (incomeList?.data ?? [])
    .filter(item =>
      !search ||
      item.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.businessUnitName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")   cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "amount") cmp = (a.amount ?? 0) - (b.amount ?? 0);
      if (sortBy === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <>
    <Card className="min-w-0 overflow-hidden border-none shadow-sm">
      <div className="flex flex-col gap-4 rounded-t-xl border-b bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + Sort controls */}
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-1 sm:items-center">
          <div className="relative col-span-2 w-full sm:col-span-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari invoice, customer, deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>
          {/* Sort field */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full min-w-0 bg-background sm:w-[150px] sm:shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Tanggal</SelectItem>
              <SelectItem value="amount">Jumlah</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          {/* Sort direction toggle */}
          <button
            type="button"
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            title={sortDir === "asc" ? "Urutan: Terkecil dulu" : "Urutan: Terbesar dulu"}
            className="h-9 w-9 flex items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors shrink-0"
          >
            {sortDir === "asc"
              ? <ArrowUp className="w-4 h-4 text-primary" />
              : <ArrowDown className="w-4 h-4 text-primary" />}
          </button>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:shrink-0 sm:justify-end">
          {/* Total income display */}
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground leading-tight">Total Income</p>
            <p className="text-base font-bold text-green-600 leading-tight">
              {isLoading ? "—" : formatIDR(incomeList?.totalAmount ?? 0)}
            </p>
          </div>
          <Sheet open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-green-600 text-white hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Income
            </Button>
          </SheetTrigger>
          <SheetContent className="!w-full max-w-none flex flex-col overflow-hidden p-0 sm:max-w-[480px]">
            <SheetHeader className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
              <SheetTitle>Catat Pemasukan Baru</SheetTitle>
              <SheetDescription>Isi detail transaksi income dan tekan Simpan.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {/* Jumlah & Tanggal */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Jumlah (IDR) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setF("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Business Unit & Customer */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Business Unit</Label>
                  <Select value={form.businessUnitId} onValueChange={(v) => setF("businessUnitId", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tidak ada —</SelectItem>
                      {businessUnits.map(bu => (
                        <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer with quick-add */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Customer</Label>
                    <button
                      type="button"
                      onClick={() => setAddCustOpen(true)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <UserPlus className="w-3 h-3" />
                      Tambah Customer Baru
                    </button>
                  </div>
                  <CustomerCombobox
                    customers={customers?.data ?? []}
                    value={form.customerId}
                    onChange={(v) => setF("customerId", v)}
                    onAddNew={() => setAddCustOpen(true)}
                  />
                </div>
              </div>

              {/* Quick-add Customer Dialog */}
              {addCustOpen && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-primary" />
                      Tambah Customer Baru
                    </p>
                    <button type="button" onClick={() => setAddCustOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Nama Lengkap <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="John Doe"
                        value={custForm.fullName}
                        onChange={(e) => setCustForm(p => ({ ...p, fullName: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bisnis / Perusahaan</Label>
                      <Input
                        placeholder="PT Contoh"
                        value={custForm.businessName}
                        onChange={(e) => setCustForm(p => ({ ...p, businessName: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">No. HP</Label>
                      <Input
                        placeholder="+62 812..."
                        value={custForm.phone}
                        onChange={(e) => setCustForm(p => ({ ...p, phone: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={custForm.email}
                        onChange={(e) => setCustForm(p => ({ ...p, email: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={custForm.status} onValueChange={(v) => setCustForm(p => ({ ...p, status: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Lead", "Prospect", "Negotiation", "Customer", "Repeat Customer", "VIP"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddCustOpen(false)} disabled={savingCust}>
                      Batal
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleAddCustomer} disabled={savingCust}>
                      {savingCust ? "Menyimpan..." : "Simpan & Pilih"}
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Invoice & Category */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>No. Invoice</Label>
                  <Input placeholder="INV-2026-001" value={form.invoiceNumber} onChange={(e) => setF("invoiceNumber", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setF("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Method & Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Metode Pembayaran</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setF("paymentMethod", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tax & Description */}
              <div className="space-y-1.5">
                <Label>Pajak / Tax (IDR)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.tax}
                  onChange={(e) => setF("tax", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea
                  placeholder="Keterangan transaksi..."
                  value={form.description}
                  onChange={(e) => setF("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <SheetFooter className="flex shrink-0 gap-2 border-t px-4 py-4 sm:px-6">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Income"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      <div className="divide-y sm:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {search ? "Tidak ada transaksi yang cocok." : "Belum ada data income."}
          </p>
        ) : filtered.map((item) => (
          <button
            type="button"
            key={item.id}
            className="block w-full p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => openIncomeEdit(item as Income)}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">{item.invoiceNumber || "Tanpa invoice"}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold text-green-600">{formatIDR(item.amount)}</span>
                <Badge variant="outline" className={cn(
                  "mt-1",
                  item.status === "Received" ? "border-green-200 bg-green-50 text-green-700" :
                  item.status === "Pending" ? "border-amber-200 bg-amber-50 text-amber-700" :
                  "border-red-200 bg-red-50 text-red-700",
                )}>
                  {item.status}
                </Badge>
              </span>
            </span>
            <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">Business Unit</span>
                <span className="block truncate font-medium text-foreground">{item.businessUnitName || "—"}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">Customer</span>
                <span className="block truncate font-medium text-foreground">{item.customerName || "—"}</span>
              </span>
            </span>
            <Badge variant="secondary" className="mt-3 bg-secondary/10">{item.category || "General"}</Badge>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <Table className="min-w-[780px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {search ? "Tidak ada transaksi yang cocok." : "Belum ada data income."}
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => openIncomeEdit(item as Income)}
              >
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell className="font-medium">{item.invoiceNumber || "—"}</TableCell>
                <TableCell className="text-sm">{item.businessUnitName || "—"}</TableCell>
                <TableCell className="text-sm">{item.customerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-secondary/10">{item.category || "General"}</Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-green-600 whitespace-nowrap">{formatIDR(item.amount)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={
                    item.status === "Received" ? "border-green-200 text-green-700 bg-green-50" :
                    item.status === "Pending" ? "border-amber-200 text-amber-700 bg-amber-50" :
                    "border-red-200 text-red-700 bg-red-50"
                  }>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>

    {/* ── Edit Income Sheet ─────────────────────────────────────────────── */}
    <Sheet open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
      <SheetContent className="!w-full max-w-none flex flex-col overflow-hidden p-0 sm:max-w-[480px]">
        <SheetHeader className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <SheetTitle>Edit Income</SheetTitle>
          <SheetDescription>Perbarui detail transaksi income.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Jumlah (IDR)</Label>
              <Input type="number" value={editForm.amount ?? ""} onChange={e => setEF("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={editForm.date ?? ""} onChange={e => setEF("date", e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>No. Invoice</Label>
              <Input value={editForm.invoiceNumber ?? ""} onChange={e => setEF("invoiceNumber", e.target.value)} placeholder="INV-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status ?? ""} onValueChange={v => setEF("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Business Unit</Label>
            <Select value={editForm.businessUnitId ?? ""} onValueChange={v => setEF("businessUnitId", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {businessUnits.map(bu => <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={editForm.customerId ?? ""} onValueChange={v => setEF("customerId", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {(customers?.data ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={editForm.category ?? ""} onValueChange={v => setEF("category", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Metode Pembayaran</Label>
              <Select value={editForm.paymentMethod ?? ""} onValueChange={v => setEF("paymentMethod", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Pajak / Tax (IDR)</Label>
            <Input type="number" value={editForm.tax ?? ""} onChange={e => setEF("tax", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={editForm.description ?? ""} onChange={e => setEF("description", e.target.value)} rows={2} />
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
          {deleteConfirm ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={editSaving}>Batal</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteIncome} disabled={editSaving}>
                {editSaving ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200" onClick={() => setDeleteConfirm(true)} disabled={editSaving} title="Hapus transaksi">
                <X className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)} disabled={editSaving}>Batal</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}

function ExpenseTab({ buFilter, businessUnits, startDate, endDate }: { buFilter: number | null; businessUnits: { id: number; name: string }[]; startDate?: string; endDate?: string }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: expenseList, isLoading } = useListExpenses({ businessUnitId: buFilter ?? undefined, limit: 10000, startDate: startDate ?? undefined, endDate: endDate ?? undefined });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function openExpenseEdit(item: Expense) {
    setEditItem(item);
    setEditForm({
      date: item.date ?? "",
      amount: String(item.amount ?? ""),
      vendor: item.vendor ?? "",
      receiptNumber: item.receiptNumber ?? "",
      category: item.category ?? "",
      paymentMethod: item.paymentMethod ?? "",
      tax: String(item.tax ?? ""),
      description: item.description ?? "",
      businessUnitId: item.businessUnitId ? String(item.businessUnitId) : "",
    });
  }

  function setEF(key: string, value: string) {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleEditSave() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await updateExpense.mutateAsync({
        id: editItem.id,
        data: {
          date: editForm.date || undefined,
          amount: editForm.amount ? parseFloat(editForm.amount) : undefined,
          vendor: editForm.vendor || undefined,
          receiptNumber: editForm.receiptNumber || undefined,
          category: editForm.category || undefined,
          paymentMethod: editForm.paymentMethod || undefined,
          tax: editForm.tax ? parseFloat(editForm.tax) : undefined,
          description: editForm.description || undefined,
          businessUnitId: editForm.businessUnitId ? parseInt(editForm.businessUnitId) : undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Expense berhasil diperbarui ✓" });
      setEditItem(null);
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteExpense() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await deleteExpense.mutateAsync({ id: editItem.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Expense berhasil dihapus" });
      setEditItem(null);
      setDeleteConfirm(false);
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    amount: "",
    businessUnitId: buFilter ? buFilter.toString() : "",
    vendor: "",
    receiptNumber: "",
    category: "",
    paymentMethod: "",
    tax: "",
    description: "",
  });

  function resetForm() {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      amount: "",
      businessUnitId: buFilter ? buFilter.toString() : "",
      vendor: "",
      receiptNumber: "",
      category: "",
      paymentMethod: "",
      tax: "",
      description: "",
    });
  }

  function setF(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.date || !form.amount) {
      toast({ title: "Validasi gagal", description: "Tanggal dan jumlah wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createExpense.mutateAsync({
        data: {
          date: form.date,
          amount: parseFloat(form.amount),
          businessUnitId: form.businessUnitId ? parseInt(form.businessUnitId) : undefined,
          vendor: form.vendor || undefined,
          receiptNumber: form.receiptNumber || undefined,
          category: form.category || undefined,
          paymentMethod: form.paymentMethod || undefined,
          tax: form.tax ? parseFloat(form.tax) : undefined,
          description: form.description || undefined,
        },
      });
      // Invalidate expense list + all dashboard caches for instant sync
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardCashflowQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTopBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Expense berhasil dicatat ✓" });
      resetForm();
      setIsAddOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan expense", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const filtered = (expenseList?.data ?? [])
    .filter(item =>
      !search ||
      item.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.businessUnitName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")   cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "amount") cmp = (a.amount ?? 0) - (b.amount ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <>
    <Card className="min-w-0 overflow-hidden border-none shadow-sm">
      <div className="flex flex-col gap-4 rounded-t-xl border-b bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + Sort controls */}
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-1 sm:items-center">
          <div className="relative col-span-2 w-full sm:col-span-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari vendor, receipt, deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>
          {/* Sort field */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full min-w-0 bg-background sm:w-[140px] sm:shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Tanggal</SelectItem>
              <SelectItem value="amount">Jumlah</SelectItem>
            </SelectContent>
          </Select>
          {/* Sort direction toggle */}
          <button
            type="button"
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            title={sortDir === "asc" ? "Urutan: Terkecil dulu" : "Urutan: Terbesar dulu"}
            className="h-9 w-9 flex items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors shrink-0"
          >
            {sortDir === "asc"
              ? <ArrowUp className="w-4 h-4 text-primary" />
              : <ArrowDown className="w-4 h-4 text-primary" />}
          </button>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:shrink-0 sm:justify-end">
          {/* Total expense display */}
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground leading-tight">Total Expense</p>
            <p className="text-base font-bold text-red-600 leading-tight">
              {isLoading ? "—" : formatIDR(expenseList?.totalAmount ?? 0)}
            </p>
          </div>
        <Sheet open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-red-600 text-white hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Expense
            </Button>
          </SheetTrigger>
          <SheetContent className="!w-full max-w-none flex flex-col overflow-hidden p-0 sm:max-w-[480px]">
            <SheetHeader className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
              <SheetTitle>Catat Pengeluaran Baru</SheetTitle>
              <SheetDescription>Isi detail transaksi expense dan tekan Simpan.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {/* Jumlah & Tanggal */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Jumlah (IDR) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setF("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Business Unit */}
              <div className="space-y-1.5">
                <Label>Business Unit</Label>
                <Select value={form.businessUnitId} onValueChange={(v) => setF("businessUnitId", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {businessUnits.map(bu => (
                      <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Vendor & Receipt */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Vendor / Supplier</Label>
                  <Input placeholder="Nama vendor..." value={form.vendor} onChange={(e) => setF("vendor", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>No. Receipt</Label>
                  <Input placeholder="RCP-2026-001" value={form.receiptNumber} onChange={(e) => setF("receiptNumber", e.target.value)} />
                </div>
              </div>

              {/* Category & Payment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setF("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Metode Pembayaran</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setF("paymentMethod", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tax & Description */}
              <div className="space-y-1.5">
                <Label>Pajak / Tax (IDR)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.tax}
                  onChange={(e) => setF("tax", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea
                  placeholder="Keterangan pengeluaran..."
                  value={form.description}
                  onChange={(e) => setF("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <SheetFooter className="flex shrink-0 gap-2 border-t px-4 py-4 sm:px-6">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Expense"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      <div className="divide-y sm:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {search ? "Tidak ada transaksi yang cocok." : "Belum ada data expense."}
          </p>
        ) : filtered.map((item) => (
          <button
            type="button"
            key={item.id}
            className="block w-full p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => openExpenseEdit(item as Expense)}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">{item.receiptNumber || "Tanpa receipt"}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </span>
              <span className="shrink-0 font-bold text-red-600">{formatIDR(item.amount)}</span>
            </span>
            <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">Business Unit</span>
                <span className="block truncate font-medium text-foreground">{item.businessUnitName || "—"}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">Vendor</span>
                <span className="block truncate font-medium text-foreground">{item.vendor || "—"}</span>
              </span>
            </span>
            <Badge variant="secondary" className="mt-3 bg-secondary/10">{item.category || "General"}</Badge>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Receipt #</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  {search ? "Tidak ada transaksi yang cocok." : "Belum ada data expense."}
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => openExpenseEdit(item as Expense)}
              >
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell className="font-medium">{item.receiptNumber || "—"}</TableCell>
                <TableCell className="text-sm">{item.businessUnitName || "—"}</TableCell>
                <TableCell className="text-sm">{item.vendor || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-secondary/10">{item.category || "General"}</Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-red-600 whitespace-nowrap">{formatIDR(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>

    {/* ── Edit Expense Sheet ────────────────────────────────────────────── */}
    <Sheet open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
      <SheetContent className="!w-full max-w-none flex flex-col overflow-hidden p-0 sm:max-w-[480px]">
        <SheetHeader className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <SheetTitle>Edit Expense</SheetTitle>
          <SheetDescription>Perbarui detail transaksi pengeluaran.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Jumlah (IDR)</Label>
              <Input type="number" value={editForm.amount ?? ""} onChange={e => setEF("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={editForm.date ?? ""} onChange={e => setEF("date", e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Business Unit</Label>
            <Select value={editForm.businessUnitId ?? ""} onValueChange={v => setEF("businessUnitId", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {businessUnits.map(bu => <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Vendor / Supplier</Label>
              <Input value={editForm.vendor ?? ""} onChange={e => setEF("vendor", e.target.value)} placeholder="Nama vendor..." />
            </div>
            <div className="space-y-1.5">
              <Label>No. Receipt</Label>
              <Input value={editForm.receiptNumber ?? ""} onChange={e => setEF("receiptNumber", e.target.value)} placeholder="RCP-2026-001" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={editForm.category ?? ""} onValueChange={v => setEF("category", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Metode Pembayaran</Label>
              <Select value={editForm.paymentMethod ?? ""} onValueChange={v => setEF("paymentMethod", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Pajak / Tax (IDR)</Label>
            <Input type="number" value={editForm.tax ?? ""} onChange={e => setEF("tax", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={editForm.description ?? ""} onChange={e => setEF("description", e.target.value)} rows={2} />
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t px-4 py-4 sm:px-6">
          {deleteConfirm ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={editSaving}>Batal</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteExpense} disabled={editSaving}>
                {editSaving ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200" onClick={() => setDeleteConfirm(true)} disabled={editSaving} title="Hapus transaksi">
                <X className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)} disabled={editSaving}>Batal</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}

function ProfitLossTab({ buFilter }: { buFilter: number | null }) {
  const [period, setPeriod] = useState("this_month");
  const { data: pl, isLoading } = useGetProfitLoss({ businessUnitId: buFilter, period: period as any });

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full bg-card sm:w-[180px]">
            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-[400px] md:col-span-3 rounded-xl" />
        </div>
      ) : pl ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  Total Revenue <TrendingUp className="w-4 h-4 ml-2 text-green-500" />
                </p>
                <p className="break-words text-2xl font-bold text-foreground sm:text-3xl">{formatIDR(pl.revenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  Total Expenses <TrendingDown className="w-4 h-4 ml-2 text-red-500" />
                </p>
                <p className="break-words text-2xl font-bold text-foreground sm:text-3xl">{formatIDR(pl.expenses)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-primary-foreground/80 text-sm font-medium mb-2 flex items-center">
                      Net Profit <Wallet className="w-4 h-4 ml-2 text-primary-foreground/70" />
                    </p>
                    <p className="break-words text-2xl font-bold sm:text-3xl">{formatIDR(pl.netProfit)}</p>
                  </div>
                  <div className="w-fit rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                    {pl.margin}% Margin
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Profit & Loss Breakdown</CardTitle>
              <CardDescription>Daily revenue vs expense trend for {pl.period}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden px-3 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-4 h-[320px] w-full sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pl.breakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatIDR(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} name="Revenue" />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={3} dot={{r: 4, fill: 'hsl(var(--card))', strokeWidth: 2}} name="Net Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function CashflowTab({ buFilter }: { buFilter: number | null }) {
  const [period, setPeriod] = useState("monthly");
  const { data: cf, isLoading } = useGetCashflowDetail({ businessUnitId: buFilter, period: period as any });

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full bg-card sm:w-[180px]">
            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl w-full" />
          <Skeleton className="h-28 rounded-xl w-full" />
          <Skeleton className="h-28 rounded-xl w-full" />
          <Skeleton className="h-28 rounded-xl w-full" />
          <Skeleton className="h-[400px] rounded-xl w-full md:col-span-4 mt-6" />
        </div>
      ) : cf ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Card className="border-none shadow-sm">
                <CardContent className="flex h-full flex-col justify-center p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground mb-1">Bank Balance</p>
                  <p className="break-words text-xl font-bold sm:text-2xl">{formatIDR(cf.bankBalance)}</p>
                </CardContent>
             </Card>
             <Card className="border-none shadow-sm">
                <CardContent className="flex h-full flex-col justify-center p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    Total Inflow <ArrowDownRight className="w-3 h-3 ml-1 text-green-500" />
                  </p>
                  <p className="break-words text-xl font-bold text-green-600 sm:text-2xl">{formatIDR(cf.totalInflow)}</p>
                </CardContent>
             </Card>
             <Card className="border-none shadow-sm">
                <CardContent className="flex h-full flex-col justify-center p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    Total Outflow <ArrowUpRight className="w-3 h-3 ml-1 text-red-500" />
                  </p>
                  <p className="break-words text-xl font-bold text-red-600 sm:text-2xl">{formatIDR(cf.totalOutflow)}</p>
                </CardContent>
             </Card>
             <Card className={`border-none shadow-sm ${cf.netCashflow >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <CardContent className="flex h-full flex-col justify-center p-4 sm:p-5">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Net Cashflow</p>
                  <p className={`break-words text-xl font-bold sm:text-2xl ${cf.netCashflow >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {cf.netCashflow >= 0 ? '+' : ''}{formatIDR(cf.netCashflow)}
                  </p>
                </CardContent>
             </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Cashflow Trend</CardTitle>
              <CardDescription>Inflow vs Outflow over time</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden px-3 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-4 h-[320px] w-full sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cf.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatIDR(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area type="monotone" dataKey="inflow" stroke="#16a34a" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} name="Inflow" />
                    <Area type="monotone" dataKey="outflow" stroke="#dc2626" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} name="Outflow" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
