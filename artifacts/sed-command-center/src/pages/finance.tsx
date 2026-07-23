import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useListIncome, useListExpenses, useGetProfitLoss, useGetCashflowDetail,
  useListBusinessUnits, useListCustomers, useCreateIncome, useCreateExpense, useCreateCustomer,
  getListIncomeQueryKey, getListExpensesQueryKey, getListCustomersQueryKey,
  getGetDashboardSummaryQueryKey, getGetDashboardRevenueChartQueryKey,
} from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar as CalendarIcon, Download, FileSpreadsheet, ChevronDown, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight, UserPlus, Building2, X, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";

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
  const [periodFilter, setPeriodFilter] = useState("this_month");
  const [exporting, setExporting] = useState(false);

  const { data: businessUnits } = useListBusinessUnits();
  const { toast } = useToast();

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

      if (tab === "expenses") {
        const res = await fetch(`${BASE}/api/finance/expenses?limit=5000${buParam}`);
        const json = await res.json();
        rows = (json.data ?? json) as Record<string, unknown>[];
        cols = EXPENSE_COLS;
        filename = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        const res = await fetch(`${BASE}/api/finance/income?limit=5000${buParam}`);
        const json = await res.json();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Finance Hub</h2>
          <p className="text-muted-foreground">
            {buFromUrl && buNameFromUrl
              ? `Transaksi untuk ${buNameFromUrl}`
              : "Manage cashflow, track transactions, and analyze profitability."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-[200px] bg-background">
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
              <Button variant="outline" disabled={exporting}>
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
        </div>
      </div>

      {/* BU filter banner — shown when deep-linked from a BU detail card */}
      {buFromUrl && buNameFromUrl && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">
            Menampilkan transaksi untuk:{" "}
            <span className="font-semibold text-primary">{buNameFromUrl}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBuFilter}
            className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <X className="w-3.5 h-3.5" />
            Tampilkan semua
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 shrink-0" asChild>
            <Link href={`/business-units/${buFromUrl}`}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Link>
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="bg-card border w-full justify-start h-auto p-1 overflow-x-auto rounded-lg">
          <TabsTrigger value="income" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Income</TabsTrigger>
          <TabsTrigger value="expenses" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
          <TabsTrigger value="profit-loss" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cashflow" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cashflow</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-0 outline-none">
          <IncomeTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} businessUnits={businessUnits ?? []} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0 outline-none">
          <ExpenseTab buFilter={buFilter === "all" ? null : parseInt(buFilter)} businessUnits={businessUnits ?? []} />
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

function IncomeTab({ buFilter, businessUnits }: { buFilter: number | null; businessUnits: { id: number; name: string }[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: incomeList, isLoading } = useListIncome({ businessUnitId: buFilter ?? undefined, limit: 10000 });
  const { data: customers } = useListCustomers({ limit: 1000 });
  const createIncome = useCreateIncome();
  const createCustomer = useCreateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Invalidate income list + dashboard caches for instant sync
      queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() });
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
    <Card className="border-none shadow-sm">
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-3 justify-between items-center rounded-t-xl">
        {/* Search + Sort controls */}
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-72">
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
            <SelectTrigger className="w-[150px] bg-background shrink-0">
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
        <Sheet open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Income
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-[480px] flex flex-col overflow-hidden p-0">
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <SheetTitle>Catat Pemasukan Baru</SheetTitle>
              <SheetDescription>Isi detail transaksi income dan tekan Simpan.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Jumlah & Tanggal */}
              <div className="grid grid-cols-2 gap-4">
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
                  <Select value={form.customerId} onValueChange={(v) => setF("customerId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        (customers?.data?.length ?? 0) === 0
                          ? "Belum ada customer — tambah dulu"
                          : "Pilih Customer (opsional)"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers?.data?.length ?? 0) === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground space-y-2">
                          <UserPlus className="w-6 h-6 mx-auto opacity-40" />
                          <p>Belum ada customer.</p>
                          <button
                            type="button"
                            onClick={() => { setAddCustOpen(true); }}
                            className="text-primary hover:underline font-medium text-xs"
                          >
                            + Tambah Customer Baru
                          </button>
                        </div>
                      ) : (
                        <>
                          <SelectItem value="none">— Tidak ada —</SelectItem>
                          {(customers?.data ?? []).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.fullName}
                              {c.businessName ? <span className="text-muted-foreground ml-1 text-xs">· {c.businessName}</span> : null}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

            <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
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

      <div className="overflow-x-auto">
        <Table>
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
              <TableRow key={item.id} className="hover:bg-muted/30">
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
  );
}

function ExpenseTab({ buFilter, businessUnits }: { buFilter: number | null; businessUnits: { id: number; name: string }[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: expenseList, isLoading } = useListExpenses({ businessUnitId: buFilter ?? undefined, limit: 10000 });
  const createExpense = useCreateExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Invalidate expense list + dashboard caches for instant sync
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardRevenueChartQueryKey() });
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
    <Card className="border-none shadow-sm">
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-3 justify-between items-center rounded-t-xl">
        {/* Search + Sort controls */}
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-72">
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
            <SelectTrigger className="w-[140px] bg-background shrink-0">
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
        <Sheet open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Expense
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-[480px] flex flex-col overflow-hidden p-0">
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <SheetTitle>Catat Pengeluaran Baru</SheetTitle>
              <SheetDescription>Isi detail transaksi expense dan tekan Simpan.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Jumlah & Tanggal */}
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

            <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
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

      <div className="overflow-x-auto">
        <Table>
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
              <TableRow key={item.id} className="hover:bg-muted/30">
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
  );
}

function ProfitLossTab({ buFilter }: { buFilter: number | null }) {
  const [period, setPeriod] = useState("this_month");
  const { data: pl, isLoading } = useGetProfitLoss({ businessUnitId: buFilter, period: period as any });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] bg-card">
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
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  Total Revenue <TrendingUp className="w-4 h-4 ml-2 text-green-500" />
                </p>
                <p className="text-3xl font-bold text-foreground">{formatIDR(pl.revenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  Total Expenses <TrendingDown className="w-4 h-4 ml-2 text-red-500" />
                </p>
                <p className="text-3xl font-bold text-foreground">{formatIDR(pl.expenses)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-primary-foreground/80 text-sm font-medium mb-2 flex items-center">
                      Net Profit <Wallet className="w-4 h-4 ml-2 text-primary-foreground/70" />
                    </p>
                    <p className="text-3xl font-bold">{formatIDR(pl.netProfit)}</p>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
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
            <CardContent>
              <div className="h-[400px] w-full mt-4">
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] bg-card">
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
                <CardContent className="p-5 flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-1">Bank Balance</p>
                  <p className="text-2xl font-bold">{formatIDR(cf.bankBalance)}</p>
                </CardContent>
             </Card>
             <Card className="border-none shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    Total Inflow <ArrowDownRight className="w-3 h-3 ml-1 text-green-500" />
                  </p>
                  <p className="text-2xl font-bold text-green-600">{formatIDR(cf.totalInflow)}</p>
                </CardContent>
             </Card>
             <Card className="border-none shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    Total Outflow <ArrowUpRight className="w-3 h-3 ml-1 text-red-500" />
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatIDR(cf.totalOutflow)}</p>
                </CardContent>
             </Card>
             <Card className={`border-none shadow-sm ${cf.netCashflow >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <CardContent className="p-5 flex flex-col justify-center h-full">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Net Cashflow</p>
                  <p className={`text-2xl font-bold ${cf.netCashflow >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
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
            <CardContent>
              <div className="h-[400px] w-full mt-4">
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
