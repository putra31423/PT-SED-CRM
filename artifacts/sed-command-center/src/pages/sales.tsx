import { useState } from "react";
import {
  useListDeals, useGetPipelineSummary, useUpdateDeal,
  getListDealsQueryKey, getGetPipelineSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
type Stage = typeof STAGES[number];

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const { data: summary } = useGetPipelineSummary();
  const { data: deals, isLoading } = useListDeals();
  const updateDeal = useUpdateDeal();

  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

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

    // Optimistic update — move the card immediately in the cache
    queryClient.setQueryData(dealsKey, (old: typeof deals) =>
      (old ?? []).map(d => d.id === draggedDealId ? { ...d, stage } : d)
    );

    updateDeal.mutate(
      { id: draggedDealId, data: { stage } },
      {
        onSuccess: () => {
          // Refetch both to get server-confirmed data + updated pipeline totals
          queryClient.invalidateQueries({ queryKey: dealsKey });
          queryClient.invalidateQueries({ queryKey: summaryKey });
        },
        onError: () => {
          // Roll back on failure
          queryClient.setQueryData(dealsKey, previousDeals);
          queryClient.setQueryData(summaryKey, previousSummary);
        },
      }
    );

    setDraggedDealId(null);
  };

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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Sales Pipeline</h2>
          <p className="text-muted-foreground">Manage deals and opportunities across all stages.</p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90">
          <Target className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

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
                          <div>
                            <p className="font-semibold text-sm line-clamp-2 leading-tight mb-1" title={deal.title}>
                              {deal.title}
                            </p>
                            <p className="font-bold text-primary text-sm">{formatIDR(deal.value)}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                            {deal.customerName && (
                              <div className="flex items-center gap-1.5 truncate">
                                <div className="w-4 h-4 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
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
  );
}
