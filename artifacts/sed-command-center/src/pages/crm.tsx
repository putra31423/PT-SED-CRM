import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  useListCustomers, useGetCustomerStats, useCreateCustomer, useListBusinessUnits,
  getListCustomersQueryKey, getGetCustomerStatsQueryKey, getListBusinessUnitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Search, Plus, Users, ArrowUpRight, Phone, Mail, Building, Clock, X, ArrowLeft, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { QueryErrorAlert } from "@/components/query-error-alert";
import { formatApiError } from "@/lib/api-error";
import { getEmailLink, getWhatsAppLink } from "@/lib/contact-links";

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  businessName: "",
  businessUnitId: "",
  status: "Lead" as const,
  notes: "",
};

const statusColors: Record<string, string> = {
  "Lead": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  "Prospect": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "Negotiation": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "Customer": "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  "Repeat Customer": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "VIP": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
};

const businessUnitNameCollator = new Intl.Collator("id", {
  numeric: true,
  sensitivity: "base",
});

type CustomerSort = "business_unit" | "name" | "date_added" | "last_modified";

export default function CRM() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<CustomerSort>("business_unit");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const { data: businessUnits } = useListBusinessUnits();
  const orderedBusinessUnits = [...(businessUnits ?? [])].sort((a, b) =>
    businessUnitNameCollator.compare(a.name, b.name),
  );

  // Read ?bu= / ?buName= from URL (deep-link from BU detail page, and the
  // Business Unit filter below). wouter's useLocation() returns the pathname
  // only, so the query string has to come from useSearch().
  const qp = new URLSearchParams(useSearch());
  const buFromUrl = qp.get("bu") ?? "";
  const buNameFromUrl = qp.get("buName") ?? "";

  const customersQuery = useListCustomers({
    search: search.length > 2 ? search : null,
    status: statusFilter !== "all" ? statusFilter as any : null,
    businessUnitId: buFromUrl ? parseInt(buFromUrl) : undefined,
    limit: 1000,
  });
  const { data: customersData, isLoading, error: customersError } = customersQuery;
  
  const { data: stats } = useGetCustomerStats();
  const statusAssignmentTotal = stats?.byStatus.reduce((sum, item) => sum + item.count, 0) ?? 0;

  function clearBuFilter() {
    setLocation("/crm");
  }

  // Writing the filter into the URL (rather than local state) keeps it shareable
  // and lets the browser Back button undo it, and carries buName so the heading
  // still reads "Customer untuk <BU>" exactly as it does for the deep-link.
  function selectBusinessUnit(value: string) {
    if (value === "all") {
      clearBuFilter();
      return;
    }
    const unit = orderedBusinessUnits.find(bu => String(bu.id) === value);
    setLocation(
      `/crm?bu=${value}${unit ? `&buName=${encodeURIComponent(unit.name)}` : ""}`,
    );
  }

  function setF(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      toast({ title: "Validasi gagal", description: "Nama lengkap wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createCustomer.mutateAsync({
        data: {
          fullName: form.fullName.trim(),
          phone: form.phone || undefined,
          email: form.email || undefined,
          businessName: form.businessName || undefined,
          businessUnitId: form.businessUnitId ? parseInt(form.businessUnitId) : undefined,
          status: form.status as any,
          notes: form.notes || undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetCustomerStatsQueryKey() }),
        // The BU dropdown shows a per-unit customer count, so it goes stale
        // the moment a customer is added to one.
        queryClient.invalidateQueries({ queryKey: getListBusinessUnitsQueryKey() }),
      ]);
      toast({ title: "Customer berhasil ditambahkan ✓" });
      setForm({ ...EMPTY_FORM });
      setIsAddOpen(false);
    } catch (error) {
      toast({
        title: "Gagal menyimpan customer",
        description: formatApiError(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Customer Database</h2>
          <p className="text-muted-foreground">
            {buNameFromUrl
              ? `Customer untuk ${buNameFromUrl}`
              : "Manage leads, prospects, and VIP clients across all units."}
          </p>
        </div>
        
        <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Customer
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Customer</SheetTitle>
            </SheetHeader>
            <div className="grid gap-5 py-6">
              {/* Full Name */}
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={e => setF("fullName", e.target.value)}
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+62..."
                    value={form.phone}
                    onChange={e => setF("phone", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={e => setF("email", e.target.value)}
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="grid gap-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Acme Corp"
                  value={form.businessName}
                  onChange={e => setF("businessName", e.target.value)}
                />
              </div>

              {/* Status + Business Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setF("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Prospect">Prospect</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Repeat Customer">Repeat Customer</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Business Unit</Label>
                  <Select value={form.businessUnitId} onValueChange={v => setF("businessUnitId", v)}>
                    <SelectTrigger><SelectValue placeholder="— Pilih BU —" /></SelectTrigger>
                    <SelectContent>
                      {orderedBusinessUnits.map(bu => (
                        <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Catatan singkat..."
                  value={form.notes}
                  onChange={e => setF("notes", e.target.value)}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Menyimpan..." : "Save Customer"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {customersError && (
        <QueryErrorAlert
          error={customersError}
          onRetry={() => void customersQuery.refetch()}
          title="Daftar customer gagal dimuat"
        />
      )}

      {stats && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-foreground/80 text-sm font-medium mb-1">Total Customer Unik</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm mt-4 text-primary-foreground/90 flex items-center">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +{stats.growth}% from last month
                </p>
              </CardContent>
            </Card>
          
            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2">
              {stats.byStatus.slice(0, 5).map(stat => (
                <Card key={stat.status} className="border-none shadow-sm flex flex-col justify-center items-center text-center p-4 cursor-pointer hover-elevate transition-all" onClick={() => setStatusFilter(stat.status)}>
                  <p className="text-2xl font-bold text-foreground mb-1">{stat.count}</p>
                  <Badge variant="outline" className={statusColors[stat.status] || ""}>{stat.status}</Badge>
                </Card>
              ))}
            </div>
          </div>
          {statusAssignmentTotal > stats.total && (
            <p className="px-1 text-xs text-muted-foreground">
              Total customer tetap {stats.total}. Jumlah kartu status dapat lebih besar karena satu customer bisa memiliki beberapa status.
            </p>
          )}
        </div>
      )}

      <Card className="border-none shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-input"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[190px] bg-background shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business_unit">Business Unit 1–{orderedBusinessUnits.length}</SelectItem>
                <SelectItem value="name">Nama A–Z</SelectItem>
                <SelectItem value="date_added">Date Added</SelectItem>
                <SelectItem value="last_modified">Last Modified</SelectItem>
              </SelectContent>
            </Select>
            {/* Filter per Business Unit — shares the ?bu= URL param with the
                deep-link from the BU detail page, so both stay in sync. */}
            <Select value={buFromUrl || "all"} onValueChange={selectBusinessUnit}>
              {/* Wide enough for a unit name plus its customer count before the
                  label starts clipping against the chevron. */}
              <SelectTrigger className="w-[290px] bg-background shrink-0">
                <Building className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Semua · {stats?.total ?? 0} customer / {orderedBusinessUnits.length} unit
                </SelectItem>
                {orderedBusinessUnits.map(bu => (
                  <SelectItem key={bu.id} value={String(bu.id)}>
                    {bu.name} · {bu.totalCustomers ?? 0} customer
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button 
              variant={statusFilter === "all" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStatusFilter("all")}
              className="whitespace-nowrap"
            >
              All Status
            </Button>
            {["Lead", "Customer", "VIP"].map(s => (
              <Button 
                key={s}
                variant={statusFilter === s ? "default" : "outline"} 
                size="sm" 
                onClick={() => setStatusFilter(s)}
                className="whitespace-nowrap"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[250px]">Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow Up</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 5}).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : customersData?.data && customersData.data.length > 0 ? (
                [...customersData.data].sort((a, b) => {
                  if (sortBy === "business_unit") {
                    if (!a.businessUnitName && b.businessUnitName) return 1;
                    if (a.businessUnitName && !b.businessUnitName) return -1;
                    const byUnit = businessUnitNameCollator.compare(
                      a.businessUnitName ?? "",
                      b.businessUnitName ?? "",
                    );
                    return byUnit || a.fullName.localeCompare(b.fullName, "id");
                  }
                  if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
                  if (sortBy === "date_added") return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
                  if (sortBy === "last_modified") return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
                  return 0;
                }).map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-medium">
                          {customer.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{customer.fullName}</p>
                          {customer.businessName && (
                            <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                              <Building className="w-3 h-3 mr-1" /> {customer.businessName}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {customer.email && (
                          <a
                            href={getEmailLink(customer.email) ?? undefined}
                            className="flex w-fit items-center text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label={`Kirim email ke ${customer.email}`}
                          >
                            <Mail className="w-3.5 h-3.5 mr-2 shrink-0" /> {customer.email}
                          </a>
                        )}
                        {customer.phone && (
                          <a
                            href={getWhatsAppLink(customer.phone) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-fit items-center text-muted-foreground transition-colors hover:text-green-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label={`Chat WhatsApp dengan ${customer.fullName}`}
                            title="Buka chat WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5 mr-2 shrink-0" /> {customer.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{customer.businessUnitName || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.status?.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                          <Badge key={s} variant="outline" className={statusColors[s] || ""}>
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        {customer.nextFollowUp ? new Date(customer.nextFollowUp).toLocaleDateString() : "Not set"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" asChild>
                        <Link href={`/crm/${customer.id}`}>
                          View Profile
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No customers found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
