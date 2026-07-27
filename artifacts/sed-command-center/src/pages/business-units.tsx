import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  getListBusinessUnitsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, Globe, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Media", "Digital", "Tourism", "Luxury", "Travel Support", "Lifestyle", "Service", "Retail"] as const;
type Category = typeof CATEGORIES[number];

interface FormState {
  name: string;
  slug: string;
  category: Category | "";
  website: string;
  description: string;
  notes: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  category: "",
  website: "",
  description: "",
  notes: "",
  isActive: true,
});

type BU = { id: number; name: string; slug: string; category: string; website?: string | null; logoUrl?: string | null; description?: string | null; isActive?: boolean | null };

export default function BusinessUnits() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<BU | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<BU | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: units, isLoading } = useListBusinessUnits();
  const createMutation = useCreateBusinessUnit();
  const updateMutation = useUpdateBusinessUnit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredUnits = (units ?? []).filter((unit) => {
    const matchesSearch = unit.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || unit.category === category;
    return matchesSearch && matchesCategory;
  });

  function openAdd() {
    setForm(emptyForm());
    setAddOpen(true);
  }

  function openEdit(e: React.MouseEvent, unit: BU) {
    e.preventDefault();
    e.stopPropagation();
    setForm({
      name: unit.name ?? "",
      slug: unit.slug ?? "",
      category: (unit.category as Category) ?? "",
      website: unit.website ?? "",
      description: unit.description ?? "",
      notes: "",
      isActive: unit.isActive ?? true,
    });
    setEditUnit(unit);
  }

  function openDelete(e: React.MouseEvent, unit: BU) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteUnit(unit);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // auto-generate slug from name on add
      if (key === "name" && !editUnit) {
        next.slug = (value as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.name || !form.category) {
      toast({ title: "Validasi gagal", description: "Nama dan kategori wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editUnit) {
        await updateMutation.mutateAsync({
          id: editUnit.id,
          data: {
            name: form.name,
            category: form.category as Category,
            website: form.website || undefined,
            description: form.description || undefined,
            notes: form.notes || undefined,
            isActive: form.isActive,
          },
        });
        toast({ title: "Business unit diperbarui" });
        setEditUnit(null);
      } else {
        await createMutation.mutateAsync({
          data: {
            name: form.name,
            slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
            category: form.category as Category,
            website: form.website || undefined,
            description: form.description || undefined,
            notes: form.notes || undefined,
            isActive: form.isActive,
          },
        });
        toast({ title: "Business unit ditambahkan" });
        setAddOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: getListBusinessUnitsQueryKey() });
    } catch {
      toast({ title: "Gagal menyimpan", description: "Terjadi kesalahan, coba lagi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteUnit) return;
    setDeleting(true);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      // customFetch, not bare fetch: it attaches the Supabase bearer token and
      // throws on non-2xx. A bare fetch here returns 401 now that the API
      // requires authentication.
      await customFetch(`${BASE}/api/business-units/${deleteUnit.id}`, { method: "DELETE" });
      toast({ title: "Business unit dihapus" });
      queryClient.invalidateQueries({ queryKey: getListBusinessUnitsQueryKey() });
      setDeleteUnit(null);
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const formDialog = (open: boolean, onOpenChange: (v: boolean) => void, title: string, description: string) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="bu-name">Nama Business Unit <span className="text-destructive">*</span></Label>
              <Input
                id="bu-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="contoh: BaliUpdate.id"
              />
            </div>
            {!editUnit && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="bu-slug">Slug (URL)</Label>
                <Input
                  id="bu-slug"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  placeholder="contoh: baliupdate-id"
                />
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
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
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="bu-website">Website</Label>
              <Input
                id="bu-website"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="bu-desc">Deskripsi</Label>
              <Textarea
                id="bu-desc"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Deskripsi singkat tentang bisnis unit ini"
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="bu-notes">Catatan Internal</Label>
              <Textarea
                id="bu-notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Catatan internal (tidak tampil ke publik)"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                id="bu-active"
                checked={form.isActive}
                onCheckedChange={(v) => setField("isActive", v)}
              />
              <Label htmlFor="bu-active">Status Aktif</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : editUnit ? "Simpan Perubahan" : "Tambah Business Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Business Units</h2>
          <p className="text-muted-foreground">Kelola dan pantau {units?.length ?? 0} anak perusahaan.</p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Business Unit
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search business units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl w-full" />
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">Tidak ada business unit</h3>
          <p className="text-muted-foreground text-center max-w-md mt-2">
            Belum ada data yang sesuai dengan filter saat ini.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategory("all"); }}>
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUnits.map((unit) => (
            <Link key={unit.id} href={`/business-units/${unit.id}`}>
              <Card className="hover-elevate cursor-pointer h-full border-none shadow-sm bg-card hover:shadow-md transition-all group overflow-hidden flex flex-col relative">
                {/* Action buttons — appear on hover */}
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => openEdit(e, unit as BU)}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => openDelete(e, unit as BU)}
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <CardHeader className="pb-3 flex-none">
                  <div className="flex items-center gap-3 pr-16">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {unit.logoUrl ? (
                        <img src={unit.logoUrl} alt={unit.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-base truncate" title={unit.name}>{unit.name}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 truncate">
                        {unit.website ? (
                          <div className="flex items-center truncate">
                            <Globe className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">{unit.website.replace(/^https?:\/\//, "")}</span>
                          </div>
                        ) : (
                          <span className="truncate">No website</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-end">
                  <div className="mb-3">
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground font-medium rounded-md">
                      {unit.category}
                    </Badge>
                    {unit.isActive ? (
                      <Badge variant="outline" className="ml-2 border-green-200 text-green-700 bg-green-50 rounded-md">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 border-red-200 text-red-700 bg-red-50 rounded-md">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {unit.description || "Belum ada deskripsi."}
                  </p>
                  <div className="mt-3 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Lihat detail</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      {formDialog(addOpen, setAddOpen, "Tambah Business Unit", "Isi detail unit bisnis baru PT Solusi Era Digital.")}

      {/* Edit Dialog */}
      {formDialog(
        editUnit !== null,
        (v) => { if (!v) setEditUnit(null); },
        "Edit Business Unit",
        `Perbarui data untuk ${editUnit?.name ?? ""}.`,
      )}

      {/* Delete Confirm */}
      <Dialog open={deleteUnit !== null} onOpenChange={(v) => { if (!v) setDeleteUnit(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Hapus Business Unit?</DialogTitle>
            <DialogDescription>
              <strong>{deleteUnit?.name}</strong> akan dihapus secara permanen. Data income, expense, dan customer yang terhubung mungkin terpengaruh. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteUnit(null)} disabled={deleting}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
