import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetCustomer, useUpdateCustomer, useDeleteCustomer, useListBusinessUnits,
  getGetCustomerQueryKey, getListCustomersQueryKey, getGetCustomerStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Mail, Phone, MapPin, Building, Globe,
  Calendar, Briefcase, FileText, CheckCircle2, MessageSquare,
  Facebook, Instagram, Tag, Clock, Plus, User, Pencil,
  Star, Crown, Users, TrendingUp, Handshake, Search, Repeat2, Trash2,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Lead",            label: "Lead",           icon: Search,    color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "Prospect",        label: "Prospect",        icon: TrendingUp, color: "bg-blue-50 text-blue-700 border-blue-300" },
  { value: "Negotiation",     label: "Negotiation",     icon: Handshake, color: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "Customer",        label: "Customer",        icon: Users,     color: "bg-green-50 text-green-700 border-green-300" },
  { value: "Repeat Customer", label: "Repeat Customer", icon: Repeat2,   color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { value: "VIP",             label: "VIP",             icon: Crown,     color: "bg-purple-50 text-purple-700 border-purple-300" },
];

const statusColors: Record<string, string> = {
  "Lead":            "bg-slate-100 text-slate-700 border-slate-200",
  "Prospect":        "bg-blue-50 text-blue-700 border-blue-200",
  "Negotiation":     "bg-amber-50 text-amber-700 border-amber-200",
  "Customer":        "bg-green-50 text-green-700 border-green-200",
  "Repeat Customer": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "VIP":             "bg-purple-50 text-purple-700 border-purple-200",
};

type CustomerStatus = "Lead" | "Prospect" | "Negotiation" | "Customer" | "Repeat Customer" | "VIP";

export default function CustomerDetail() {
  const [, params] = useRoute("/crm/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: customer, isLoading } = useGetCustomer(id, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) },
  });
  const { data: businessUnits } = useListBusinessUnits();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<{
    fullName: string; businessName: string; phone: string; whatsapp: string;
    email: string; nationality: string; country: string; address: string;
    businessUnitId: string; serviceInterested: string; leadSource: string;
    facebook: string; instagram: string; website: string; notes: string;
    status: CustomerStatus; lastContact: string; nextFollowUp: string;
    assignedStaff: string; tags: string;
  } | null>(null);

  function openEdit() {
    if (!customer) return;
    setForm({
      fullName:          customer.fullName ?? "",
      businessName:      customer.businessName ?? "",
      phone:             customer.phone ?? "",
      whatsapp:          customer.whatsapp ?? "",
      email:             customer.email ?? "",
      nationality:       customer.nationality ?? "",
      country:           customer.country ?? "",
      address:           customer.address ?? "",
      businessUnitId:    customer.businessUnitId?.toString() ?? "",
      serviceInterested: customer.serviceInterested ?? "",
      leadSource:        customer.leadSource ?? "",
      facebook:          customer.facebook ?? "",
      instagram:         customer.instagram ?? "",
      website:           customer.website ?? "",
      notes:             customer.notes ?? "",
      status:            (customer.status as CustomerStatus) ?? "Lead",
      lastContact:       customer.lastContact ?? "",
      nextFollowUp:      customer.nextFollowUp ?? "",
      assignedStaff:     customer.assignedStaff ?? "",
      tags:              customer.tags ?? "",
    });
    setEditOpen(true);
  }

  function setF<K extends keyof NonNullable<typeof form>>(key: K, value: NonNullable<typeof form>[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSave() {
    if (!form || !id) return;
    if (!form.fullName.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateCustomer.mutateAsync({
        id,
        data: {
          fullName:          form.fullName || undefined,
          businessName:      form.businessName || undefined,
          phone:             form.phone || undefined,
          whatsapp:          form.whatsapp || undefined,
          email:             form.email || undefined,
          nationality:       form.nationality || undefined,
          country:           form.country || undefined,
          address:           form.address || undefined,
          businessUnitId:    form.businessUnitId ? parseInt(form.businessUnitId) : undefined,
          serviceInterested: form.serviceInterested || undefined,
          leadSource:        form.leadSource || undefined,
          facebook:          form.facebook || undefined,
          instagram:         form.instagram || undefined,
          website:           form.website || undefined,
          notes:             form.notes || undefined,
          status:            form.status,
          lastContact:       form.lastContact || undefined,
          nextFollowUp:      form.nextFollowUp || undefined,
          assignedStaff:     form.assignedStaff || undefined,
          tags:              form.tags || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({ title: `Profil ${form.fullName} diperbarui ✓` });
      setEditOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan profil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setSaving(true);
    try {
      await deleteCustomer.mutateAsync({ id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetCustomerStatsQueryKey() }),
      ]);
      toast({ title: `Customer ${customer?.fullName} berhasil dihapus` });
      setLocation("/crm");
    } catch {
      toast({ title: "Gagal menghapus customer", variant: "destructive" });
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold">Customer Not Found</h2>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/crm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to CRM
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/crm" className="hover:text-foreground hover:underline transition-colors flex items-center">
          <ArrowLeft className="w-3 h-3 mr-1" /> Customer Database
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{customer.fullName}</span>
      </div>

      {/* Hero */}
      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start justify-between">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0 shadow-sm">
            {customer.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{customer.fullName}</h1>
              <Badge variant="outline" className={statusColors[customer.status] || ""}>
                {customer.status === "VIP" && <Crown className="w-3 h-3 mr-1" />}
                {customer.status === "Repeat Customer" && <Repeat2 className="w-3 h-3 mr-1" />}
                {customer.status}
              </Badge>
            </div>
            {customer.businessName && (
              <div className="flex items-center text-lg text-muted-foreground mb-4">
                <Briefcase className="w-5 h-5 mr-2" />
                {customer.businessName}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm mt-4">
              <div className="flex items-center text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Tag className="w-4 h-4 mr-2" />
                ID: {customer.customerId}
              </div>
              <div className="flex items-center text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Building className="w-4 h-4 mr-2" />
                {customer.businessUnitName || "No assigned BU"}
              </div>
              <div className="flex items-center text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <User className="w-4 h-4 mr-2" />
                Assigned: {customer.assignedStaff || "Unassigned"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
          <Button onClick={openEdit} className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5">
            Log Interaction
          </Button>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <a href={`mailto:${customer.email}`} className="text-sm font-medium hover:text-primary hover:underline">{customer.email}</a>
                  </div>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <a href={`tel:${customer.phone}`} className="text-sm font-medium hover:text-primary hover:underline">{customer.phone}</a>
                  </div>
                </div>
              )}
              {customer.whatsapp && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <span className="text-sm font-medium">{customer.whatsapp}</span>
                  </div>
                </div>
              )}
              {(customer.address || customer.country) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    {customer.address && <span className="text-sm font-medium block">{customer.address}</span>}
                    {customer.country && <span className="text-sm text-muted-foreground">{customer.country}</span>}
                  </div>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <a href={customer.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">{customer.website}</a>
                  </div>
                </div>
              )}
              {!customer.email && !customer.phone && !customer.whatsapp && !customer.address && !customer.website && (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada informasi kontak.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Social & Sourcing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lead Source</p>
                  <p className="text-sm font-medium">{customer.leadSource || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Interest</p>
                  <p className="text-sm font-medium">{customer.serviceInterested || "General"}</p>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t">
                {customer.facebook && (
                  <a href={customer.facebook} target="_blank" rel="noreferrer" className="text-blue-600 hover:opacity-80 transition-opacity">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {customer.instagram && (
                  <a href={customer.instagram} target="_blank" rel="noreferrer" className="text-pink-600 hover:opacity-80 transition-opacity">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {!customer.facebook && !customer.instagram && (
                  <p className="text-sm text-muted-foreground">Tidak ada sosial media.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Notes & Interactions</CardTitle>
              <Button variant="ghost" size="sm" onClick={openEdit}>
                <Plus className="w-4 h-4 mr-2" /> Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {customer.notes ? (
                <div className="bg-muted/30 p-4 rounded-xl border border-muted text-sm leading-relaxed whitespace-pre-wrap">
                  {customer.notes}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No notes have been added yet.</p>
                  <Button variant="link" size="sm" className="mt-1" onClick={openEdit}>+ Tambah catatan</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Follow-up Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Next Follow Up</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.nextFollowUp
                        ? new Date(customer.nextFollowUp).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                        : "No follow up scheduled"}
                    </p>
                  </div>
                </div>
                {customer.nextFollowUp && (
                  <Button variant="outline" size="sm">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Done
                  </Button>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground px-2">
                <Clock className="w-4 h-4" />
                <span>Last contact: {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString() : "Never"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Edit Profile Sheet ── */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit Profil — {customer.fullName}
            </SheetTitle>
          </SheetHeader>

          {form && (
            <div className="space-y-6 pb-8">

              {/* ── STATUS — most prominent, at top ── */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Label / Status Customer</Label>
                <p className="text-xs text-muted-foreground">Tentukan kategori customer ini untuk segmentasi dan prioritas.</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {STATUS_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = form.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setF("status", opt.value as CustomerStatus)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                          active
                            ? `${opt.color} border-current ring-2 ring-current/20`
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {opt.label}
                        {active && <Star className="w-3 h-3 ml-auto fill-current shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* ── Identity ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Identitas</p>
                <div className="space-y-1.5">
                  <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input value={form.fullName} onChange={e => setF("fullName", e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label>Bisnis / Perusahaan</Label>
                  <Input value={form.businessName} onChange={e => setF("businessName", e.target.value)} placeholder="PT Contoh" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kebangsaan</Label>
                    <Input value={form.nationality} onChange={e => setF("nationality", e.target.value)} placeholder="Indonesia" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Negara</Label>
                    <Input value={form.country} onChange={e => setF("country", e.target.value)} placeholder="Indonesia" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Alamat</Label>
                  <Input value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Jl. Raya Kuta No. 1, Bali" />
                </div>
              </div>

              <Separator />

              {/* ── Contact ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kontak</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>No. HP</Label>
                    <Input value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="+62 812..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={e => setF("whatsapp", e.target.value)} placeholder="+62 812..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setF("website", e.target.value)} placeholder="https://example.com" />
                </div>
              </div>

              <Separator />

              {/* ── Assignment ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Penugasan & Sumber</p>
                <div className="space-y-1.5">
                  <Label>Business Unit</Label>
                  <Select value={form.businessUnitId || "none"} onValueChange={v => setF("businessUnitId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tidak ada —</SelectItem>
                      {businessUnits?.map(bu => (
                        <SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Staff Penanggung Jawab</Label>
                  <Input value={form.assignedStaff} onChange={e => setF("assignedStaff", e.target.value)} placeholder="Nama staff" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Lead Source</Label>
                    <Input value={form.leadSource} onChange={e => setF("leadSource", e.target.value)} placeholder="Instagram, referral..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Layanan Diminati</Label>
                    <Input value={form.serviceInterested} onChange={e => setF("serviceInterested", e.target.value)} placeholder="Wedding, Tour..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <Input value={form.tags} onChange={e => setF("tags", e.target.value)} placeholder="vip, honeymoon, referral..." />
                </div>
              </div>

              <Separator />

              {/* ── Social ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sosial Media</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Facebook</Label>
                    <Input value={form.facebook} onChange={e => setF("facebook", e.target.value)} placeholder="https://fb.com/..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instagram</Label>
                    <Input value={form.instagram} onChange={e => setF("instagram", e.target.value)} placeholder="https://instagram.com/..." />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Dates & Notes ── */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Jadwal & Catatan</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kontak Terakhir</Label>
                    <Input type="date" value={form.lastContact} onChange={e => setF("lastContact", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Follow Up Berikutnya</Label>
                    <Input type="date" value={form.nextFollowUp} onChange={e => setF("nextFollowUp", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setF("notes", e.target.value)}
                    placeholder="Catatan interaksi, preferensi, atau hal penting lainnya..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* ── Actions ── */}
              {deleteConfirm ? (
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-destructive font-medium text-center">
                    Yakin ingin menghapus customer <strong>{customer?.fullName}</strong>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={saving}>
                      Batal
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={saving}>
                      {saving ? "Menghapus..." : "Ya, Hapus Customer"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200" onClick={() => setDeleteConfirm(true)} disabled={saving} title="Hapus customer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={saving}>
                    Batal
                  </Button>
                  <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
