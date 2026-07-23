import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBusinessUnit,
  useUpdateBusinessUnit,
  useListBusinessUnits,
  getGetBusinessUnitQueryKey,
  getListBusinessUnitsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIDR } from "@/lib/utils";
import {
  Building2, Globe, FileText, TrendingUp, CreditCard, Activity,
  Users, LayoutDashboard, Calendar, ArrowLeft, Pencil, BarChart3, ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Media", "Digital", "Tourism", "Luxury", "Travel Support", "Lifestyle", "Service", "Retail"] as const;
type Category = typeof CATEGORIES[number];

interface FormState {
  name: string;
  category: Category | "";
  website: string;
  description: string;
  notes: string;
  isActive: boolean;
}

export default function BusinessUnitDetail() {
  const [, params] = useRoute("/business-units/:id");
  const [, navigate] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: unit, isLoading } = useGetBusinessUnit(id, {
    query: { enabled: !!id, queryKey: getGetBusinessUnitQueryKey(id) },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", category: "", website: "", description: "", notes: "", isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const updateMutation = useUpdateBusinessUnit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function openEdit() {
    if (!unit) return;
    setForm({
      name: unit.name ?? "",
      category: (unit.category as Category) ?? "",
      website: unit.website ?? "",
      description: unit.description ?? "",
      notes: unit.notes ?? "",
      isActive: unit.isActive ?? true,
    });
    setEditOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name || !form.category) {
      toast({ title: "Validasi gagal", description: "Nama dan kategori wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: form.name,
          category: form.category as Category,
          website: form.website || undefined,
          description: form.description || undefined,
          notes: form.notes || undefined,
          isActive: form.isActive,
        },
      });
      toast({ title: "Business unit diperbarui ✓" });
      queryClient.invalidateQueries({ queryKey: getGetBusinessUnitQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListBusinessUnitsQueryKey() });
      setEditOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan", description: "Terjadi kesalahan, coba lagi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold">Business Unit Not Found</h2>
        <p className="text-muted-foreground mt-2">The business unit you're looking for doesn't exist.</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/business-units">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/business-units" className="hover:text-foreground hover:underline transition-colors flex items-center">
          <ArrowLeft className="w-3 h-3 mr-1" /> Business Units
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{unit.name}</span>
      </div>

      {/* Hero card */}
      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            {unit.logoUrl ? (
              <img src={unit.logoUrl} alt={unit.name} className="w-12 h-12 object-contain" />
            ) : (
              <Building2 className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{unit.name}</h1>
              <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground">
                {unit.category}
              </Badge>
              {unit.isActive ? (
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Inactive</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
              {unit.website && (
                <a
                  href={unit.website.startsWith("http") ? unit.website : `https://${unit.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  {unit.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Est. {new Date(unit.createdAt).getFullYear()}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" onClick={openEdit} className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit Details
          </Button>
          <Button
            onClick={() => navigate(`/reports?buId=${unit.id}&buName=${encodeURIComponent(unit.name)}`)}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            View Reports
          </Button>
        </div>
      </div>

      {/* KPI cards — clickable, navigate to filtered transaction views */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/finance/income?bu=${unit.id}&buName=${encodeURIComponent(unit.name)}`} className="block group">
          <Card className="border-none shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Total Revenue
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatIDR(unit.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Lihat transaksi income →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/finance/expenses?bu=${unit.id}&buName=${encodeURIComponent(unit.name)}`} className="block group">
          <Card className="border-none shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Total Expenses
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-red-500" />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatIDR(unit.totalExpenses || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Lihat transaksi expense →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/reports?buId=${unit.id}&buName=${encodeURIComponent(unit.name)}`} className="block group">
          <Card className="border-none shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Net Profit
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-green-500" />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatIDR(unit.netProfit || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Lihat laporan P&L →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/crm?bu=${unit.id}&buName=${encodeURIComponent(unit.name)}`} className="block group">
          <Card className="border-none shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Total Customers
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{unit.totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Lihat daftar customer →</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" /> Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
              <p className="text-muted-foreground text-sm leading-relaxed bg-muted/30 p-4 rounded-lg">
                {unit.description || "No description provided for this business unit."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Projects</h4>
                <p className="text-xl font-medium">{unit.totalProjects || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Invoices</h4>
                <p className="text-xl font-medium">{unit.totalInvoices || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Staff</h4>
                <p className="text-xl font-medium">{unit.totalStaff || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Executive Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-sm border border-yellow-200 dark:border-yellow-900/50 min-h-[200px] whitespace-pre-wrap">
              {unit.notes || "No operational notes recorded yet."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Business Unit</DialogTitle>
            <DialogDescription>Perbarui data untuk {unit.name}.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nama Business Unit <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="contoh: Bali Discount Club"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={(v) => setField("category", v as Category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Deskripsi</Label>
              <Textarea
                id="edit-desc"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Deskripsi singkat tentang bisnis unit ini"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Catatan Internal</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Catatan internal (tidak tampil ke publik)"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="edit-active"
                checked={form.isActive}
                onCheckedChange={(v) => setField("isActive", v)}
              />
              <Label htmlFor="edit-active">Status Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
