import { useState } from "react";
import {
  useListDeals, useGetPipelineSummary, useUpdateDeal, useCreateDeal, useListBusinessUnits,
  getListDealsQueryKey, getGetPipelineSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "@workspace/api-client-react";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
type Stage = typeof STAGES[number];

type EditForm = {
  title: string;
  stage: Stage;
  value: string;
  probability: string;
  assignedStaff: string;
  expectedCloseDate: string;
  description: string;
  notes: string;
  businessUnitId: string;
};

function dealToForm(deal: Deal): EditForm {
  return {
    title: deal.title ?? "",
    stage: (deal.stage as Stage) ?? "Lead",
    value: String(deal.value ?? ""),
    probability: String(deal.probability ?? ""),
    assignedStaff: deal.assignedStaff ?? "",
    expectedCloseDate: deal.expectedCloseDate ?? "",
    description: deal.description ?? "",
    notes: deal.notes ?? "",
    businessUnitId: deal.businessUnitId ? String(deal.businessUnitId) : "",
  };
}

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: summary } = useGetPipelineSummary();
  const { data: deals, isLoading } = useListDeals();
  const { data: businessUnits } = useListBusinessUnits();
  const updateDeal = useUpdateDeal();
  const createDeal = useCreateDeal();

  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  // New Deal sheet state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newSaving, setNewSaving] = useState(false);
  const emptyForm: EditForm = {
    title: "", stage: "Lead", value: "", probability: "50",
    assignedStaff: "", expectedCloseDate: "", description: "", notes: "", businessUnitId: "",
  };
  const [newForm, setNewForm] = useState<EditForm>(emptyForm);

  function setNF(key: keyof EditForm, value: string) {
    setNewForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleNewSave() {
    if (!newForm.title.trim()) {
      toast({ title: "Validasi gagal", description: "Judul deal wajib diisi.", variant: "destructive" });
      return;
    }
    setNewSaving(true);
    try {
      await createDeal.mutateAsync({
        data: {
          title: newForm.title.trim(),
          stage: newForm.stage as any,
          value: newForm.value ? parseFloat(newForm.value) : 0,
          probability: newForm.probability ? parseInt(newForm.probability) : undefined,
          assignedStaff: newForm.assignedStaff || undefined,
          expectedCloseDate: newForm.expectedCloseDate || undefined,
          description: newForm.description || undefined,
          notes: newForm.notes || undefined,
          businessUnitId: newForm.businessUnitId ? parseInt(newForm.businessUnitId) : undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPipelineSummaryQueryKey() }),
      ]);
      toast({ title: "Deal berhasil ditambahkan ✓" });
      setNewForm(emptyForm);
      setIsNewOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan deal", variant: "destructive" });
    } finally {
      setNewSaving(false);
    }
  }

  // Edit sheet state
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(deal: Deal) {
    setEditDeal(deal);
    setEditForm(dealToForm(deal));
  }

  function setF(key: keyof EditForm, value: string) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleEditSave() {
    if (!editDeal || !editForm) return;
    if (!editForm.title.trim()) {
      toast({ title: "Validasi gagal", description: "Judul deal wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const dealsKey = getListDealsQueryKey();
    const summaryKey = getGetPipelineSummaryQueryKey();
    try {
      await updateDeal.mutateAsync({
        id: editDeal.id,
        data: {
          title: editForm.title.trim(),
          stage: editForm.stage as any,
          value: editForm.value ? parseFloat(editForm.value) : undefined,
          probability: editForm.probability ? parseInt(editForm.probability) : undefined,
          assignedStaff: editForm.assignedStaff || undefined,
          expectedCloseDate: editForm.expectedCloseDate || undefined,
          description: editForm.description || undefined,
          notes: editForm.notes || undefined,
          businessUnitId: editForm.businessUnitId ? parseInt(editForm.businessUnitId) : undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealsKey }),
        queryClient.invalidateQueries({ queryKey: summaryKey }),
      ]);
      toast({ title: "Deal berhasil diperbarui ✓" });
      setEditDeal(null);
      setEditForm(null);
    } catch {
      toast({ title: "Gagal menyimpan deal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ─── Drag & drop ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedDealId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id.toString());
  };

  const handleDragOver = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedDealId === null) return;

    const dealsKey = getListDealsQueryKey();
    const summaryKey = getGetPipelineSummaryQueryKey();

    const previousDeals = queryClient.getQueryData(dealsKey);
    const previousSummary = queryClient.getQueryData(summaryKey);

    const deal = (deals ?? []).find(d => d.id === draggedDealId);
    if (!deal || deal.stage === stage) {
      setDraggedDealId(null);
      return;
    }

    // Optimistic — move card instantly
    queryClient.setQueryData(dealsKey, (old: typeof deals) =>
      (old ?? []).map(d => d.id === draggedDealId ? { ...d, stage } : d)
    );

    // Optimistic — update banner totals instantly
    queryClient.setQueryData(summaryKey, (old: typeof summary) => {
      if (!old) return old;
      const dealValue = deal.value;
      const fromStage = deal.stage;
      const toStage = stage;
      const wonDelta = toStage === "Won" ? dealValue : fromStage === "Won" ? -dealValue : 0;
      const wonDealsDelta = toStage === "Won" ? 1 : fromStage === "Won" ? -1 : 0;

      const updatedByStage = old.byStage.map(s => {
        if (s.stage === fromStage) return { ...s, count: s.count - 1, value: s.value - dealValue };
        if (s.stage === toStage)   return { ...s, count: s.count + 1, value: s.value + dealValue };
        return s;
      });
      if (!old.byStage.find(s => s.stage === toStage)) {
        updatedByStage.push({ stage: toStage, count: 1, value: dealValue });
      }

      return {
        ...old,
        wonValue: Math.max(0, (old.wonValue ?? 0) + wonDelta),
        wonDeals: Math.max(0, (old.wonDeals ?? 0) + wonDealsDelta),
        byStage: updatedByStage,
      };
    });

    updateDeal.mutate(
      { id: draggedDealId, data: { stage } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: dealsKey });
          queryClient.invalidateQueries({ queryKey: summaryKey });
        },
        onError: () => {
          queryClient.setQueryData(dealsKey, previousDeals);
          queryClient.setQueryData(summaryKey, previousSummary);
        },
      }
    );

    setDraggedDealId(null);
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-4 overflow-x-auto">
          {STAGES.map(s => (
            <Skeleton key={s} className="h-[600px] min-w-[300px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals?.filter(d => d.stage === stage) || [];
    return acc;
  }, {} as Record<Stage, typeof deals>);

  return (
    <>
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Sales Pipeline</h2>
            <p className="text-muted-foreground">Manage deals and opportunities across all stages.</p>
          </div>
          <Button className="shrink-0 bg-primary hover:bg-primary/90" onClick={() => { setNewForm(emptyForm); setIsNewOpen(true); }}>
            <Target className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>

        {/* Summary banner */}
        {summary && (
          <Card className="shrink-0 border-none shadow-sm bg-sidebar text-sidebar-foreground">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-sidebar-foreground/70 text-sm font-medium mb-1">Total Pipeline Value</p>
                  <p className="text-3xl font-bold text-white">{formatIDR(summary.totalValue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-8 border-l border-sidebar-border pl-8">
                <div>
                  <p className="text-sidebar-foreground/70 text-sm font-medium mb-1">Total Deals</p>
                  <p className="text-2xl font-semibold text-white">{summary.totalDeals}</p>
                </div>
                <div>
                  <p className="text-sidebar-foreground/70 text-sm font-medium mb-1 flex items-center gap-1">
                    Won Value <TrendingUp className="w-3 h-3 text-green-400" />
                  </p>
                  <p className="text-2xl font-semibold text-green-400">{formatIDR(summary.wonValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-h-[500px] h-full items-stretch">
            {STAGES.map((stage) => {
              const stageDeals = dealsByStage[stage as Stage] || [];
              const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div
                  key={stage}
                  className={`flex flex-col w-80 shrink-0 rounded-xl overflow-hidden border transition-colors ${
                    dragOverStage === stage
                      ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                      : "bg-muted/40"
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage as Stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage as Stage)}
                >
                  {/* Column header */}
                  <div className="p-3 border-b bg-card flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{stage}</h3>
                      <Badge variant="secondary" className="px-1.5 min-w-5 h-5 flex items-center justify-center">
                        {stageDeals.length}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatIDR(stageTotal).replace(/Rp\s/, '')}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="h-full flex items-center justify-center opacity-40">
                        <div className="text-center text-xs text-muted-foreground p-4 border border-dashed rounded-lg">
                          Drag deals here
                        </div>
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <Card
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          className={`cursor-grab active:cursor-grabbing border hover-elevate transition-shadow ${
                            draggedDealId === deal.id ? "opacity-50" : ""
                          }`}
                        >
                          <CardContent className="p-3 space-y-3">
                            {/* Title row + ⋮ menu */}
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm line-clamp-2 leading-tight mb-1" title={deal.title}>
                                  {deal.title}
                                </p>
                                <p className="font-bold text-primary text-sm">{formatIDR(deal.value)}</p>
                              </div>
                              {/* Edit menu — stop drag propagation so clicking doesn't drag */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-0.5"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onDragStart={(e) => e.preventDefault()}
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem
                                    onSelect={() => openEdit(deal)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    Edit Deal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Contact + BU + probability */}
                            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                              {deal.customerName && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <div className="w-4 h-4 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-[9px] font-medium">
                                    {deal.customerName.charAt(0)}
                                  </div>
                                  <span className="truncate">{deal.customerName}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <span className="truncate max-w-[120px]" title={deal.businessUnitName || ""}>
                                  {deal.businessUnitName || "No BU"}
                                </span>
                                {deal.probability && (
                                  <Badge variant="outline" className={`h-5 text-[10px] ${
                                    deal.probability > 70 ? 'text-green-600 border-green-200 bg-green-50' :
                                    deal.probability > 40 ? 'text-amber-600 border-amber-200 bg-amber-50' : ''
                                  }`}>
                                    {deal.probability}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Edit Deal Sheet ─────────────────────────────────────────────────── */}
      <Sheet
        open={!!editDeal}
        onOpenChange={(open) => {
          if (!open) { setEditDeal(null); setEditForm(null); }
        }}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Deal</SheetTitle>
          </SheetHeader>

          {editForm && (
            <div className="grid gap-5 py-6">
              {/* Title */}
              <div className="grid gap-2">
                <Label>Judul Deal <span className="text-destructive">*</span></Label>
                <Input
                  value={editForm.title}
                  onChange={e => setF("title", e.target.value)}
                  placeholder="Nama deal..."
                />
              </div>

              {/* Stage + Probability */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Stage</Label>
                  <Select value={editForm.stage} onValueChange={v => setF("stage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Probabilitas (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.probability}
                    onChange={e => setF("probability", e.target.value)}
                    placeholder="0–100"
                  />
                </div>
              </div>

              {/* Value + Business Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nilai Deal (Rp)</Label>
                  <Input
                    type="number"
                    value={editForm.value}
                    onChange={e => setF("value", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Business Unit</Label>
                  <Select
                    value={editForm.businessUnitId}
                    onValueChange={v => setF("businessUnitId", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="— Pilih BU —" /></SelectTrigger>
                    <SelectContent>
                      {(businessUnits ?? []).map(bu => (
                        <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Staff + Expected Close */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Assigned Staff</Label>
                  <Input
                    value={editForm.assignedStaff}
                    onChange={e => setF("assignedStaff", e.target.value)}
                    placeholder="Nama staff..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Close</Label>
                  <Input
                    type="date"
                    value={editForm.expectedCloseDate}
                    onChange={e => setF("expectedCloseDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label>Deskripsi</Label>
                <Input
                  value={editForm.description}
                  onChange={e => setF("description", e.target.value)}
                  placeholder="Deskripsi singkat..."
                />
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label>Catatan</Label>
                <Input
                  value={editForm.notes}
                  onChange={e => setF("notes", e.target.value)}
                  placeholder="Catatan internal..."
                />
              </div>

              <Button onClick={handleEditSave} disabled={saving} className="w-full">
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── New Deal Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={isNewOpen} onOpenChange={(o) => { if (!o) setIsNewOpen(false); }}>
        <SheetContent className="sm:max-w-[480px] flex flex-col overflow-hidden p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>New Deal</SheetTitle>
            <SheetDescription>Tambahkan peluang baru ke pipeline sales.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Judul Deal <span className="text-destructive">*</span></Label>
              <Input
                value={newForm.title}
                onChange={e => setNF("title", e.target.value)}
                placeholder="e.g. Website Redesign – PT ABC"
                autoFocus
              />
            </div>

            <Separator />

            {/* Stage & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={newForm.stage} onValueChange={v => setNF("stage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nilai (IDR)</Label>
                <Input
                  type="number"
                  value={newForm.value}
                  onChange={e => setNF("value", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Probability & Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Probabilitas (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newForm.probability}
                  onChange={e => setNF("probability", e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Close</Label>
                <Input
                  type="date"
                  value={newForm.expectedCloseDate}
                  onChange={e => setNF("expectedCloseDate", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Business Unit */}
            <div className="space-y-1.5">
              <Label>Business Unit</Label>
              <Select value={newForm.businessUnitId} onValueChange={v => setNF("businessUnitId", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {(businessUnits ?? []).map(bu => (
                    <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Staff */}
            <div className="space-y-1.5">
              <Label>Assigned Staff</Label>
              <Input
                value={newForm.assignedStaff}
                onChange={e => setNF("assignedStaff", e.target.value)}
                placeholder="Nama sales / PIC..."
              />
            </div>

            <Separator />

            {/* Description & Notes */}
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                value={newForm.description}
                onChange={e => setNF("description", e.target.value)}
                placeholder="Detail peluang, kebutuhan klien..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan Internal</Label>
              <Textarea
                value={newForm.notes}
                onChange={e => setNF("notes", e.target.value)}
                placeholder="Catatan tim..."
                rows={2}
              />
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsNewOpen(false)} disabled={newSaving}>
              Batal
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleNewSave} disabled={newSaving}>
              {newSaving ? "Menyimpan..." : "Tambah Deal"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
