import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetAnalytics, useGetRevenueReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Users, BarChart3, Activity,
  Building2, X, ArrowLeft,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";

function useQueryParams() {
  const [location] = useLocation();
  const search = location.includes("?") ? location.split("?")[1] : "";
  return new URLSearchParams(search);
}

export default function Reports() {
  const [period, setPeriod] = useState("this_month");
  const [groupBy, setGroupBy] = useState("business_unit");
  const [, navigate] = useLocation();
  const qp = useQueryParams();

  // BU filter from URL params (set by "View Reports" button on BU detail page)
  const [buId, setBuId] = useState<number | undefined>(() => {
    const v = qp.get("buId");
    return v ? parseInt(v) : undefined;
  });
  const [buName, setBuName] = useState<string>(() => qp.get("buName") ?? "");

  // Keep state in sync when URL changes (e.g. navigating to /reports directly)
  useEffect(() => {
    const newBuId = qp.get("buId");
    const newBuName = qp.get("buName");
    setBuId(newBuId ? parseInt(newBuId) : undefined);
    setBuName(newBuName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocation()[0]]);

  function clearBuFilter() {
    setBuId(undefined);
    setBuName("");
    navigate("/reports");
  }

  const analyticsParams = { period: period as any };
  const revenueParams: any = { period: period as any, groupBy: groupBy as any };
  if (buId) revenueParams.businessUnitId = buId;

  const { data: analytics, isLoading: isLoadingAnalytics } = useGetAnalytics(analyticsParams);
  const { data: revReport, isLoading: isLoadingRev } = useGetRevenueReport(revenueParams);

  const COLORS = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics & Reports</h2>
          <p className="text-muted-foreground">
            {buId
              ? `Financial reports for ${buName}`
              : "Executive insights and holding-wide performance analysis."}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* BU filter banner */}
      {buId && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">
            Menampilkan laporan untuk:{" "}
            <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-0">
              {buName}
            </Badge>
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
          <Button variant="outline" size="sm" className="h-7 gap-1.5" asChild>
            <Link href={`/business-units/${buId}`}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke {buName}
            </Link>
          </Button>
        </div>
      )}

      {/* Revenue summary cards (BU-scoped when buId is set) */}
      {isLoadingRev ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl w-full" />)}
        </div>
      ) : revReport ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium mb-1">
                    {buId ? "Revenue" : "Holding Revenue"}
                  </p>
                  <p className="text-3xl font-bold">{formatIDR(revReport.totalRevenue)}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold text-foreground">{formatIDR(revReport.totalExpenses)}</p>
                </div>
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Net Profit</p>
                  <p className={`text-3xl font-bold ${revReport.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatIDR(revReport.netProfit)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Holding-wide analytics (only shown when no BU filter) */}
      {!buId && (
        <>
          {isLoadingAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl w-full" />)}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-sm bg-card">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Revenue Growth (MoM)</p>
                      <p className="text-3xl font-bold text-foreground">+{analytics.monthlyGrowth}%</p>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-card">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Customer Acquisition</p>
                      <p className="text-3xl font-bold text-foreground">+{analytics.customerGrowth}%</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-card">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Operating Margin</p>
                      <p className="text-3xl font-bold text-foreground">24.5%</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Top / Bottom performers — holding-wide only */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" /> Top Performers
                </CardTitle>
                <CardDescription>Highest revenue business units</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : analytics?.topRevenue ? (
                  <div className="space-y-4">
                    {analytics.topRevenue.map((bu, i) => (
                      <Link key={bu.id} href={`/business-units/${bu.id}`}>
                        <div className="flex items-center justify-between hover:bg-muted/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{bu.name}</p>
                              <p className="text-xs text-muted-foreground">{bu.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatIDR(bu.revenue)}</p>
                            <p className="text-xs text-green-600">+{bu.growth.toFixed(1)}%</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" /> Bottom Performers
                </CardTitle>
                <CardDescription>Lowest revenue business units</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : analytics?.lowestRevenue ? (
                  <div className="space-y-4">
                    {analytics.lowestRevenue.map((bu, i) => (
                      <Link key={bu.id} href={`/business-units/${bu.id}`}>
                        <div className="flex items-center justify-between hover:bg-muted/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                              {(analytics.topRevenue?.length ?? 0) + i + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{bu.name}</p>
                              <p className="text-xs text-muted-foreground">{bu.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatIDR(bu.revenue)}</p>
                            <p className={`text-xs ${bu.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {bu.growth >= 0 ? "+" : ""}{bu.growth.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Revenue / Expense chart */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b mb-4">
          <div>
            <CardTitle>
              {buId ? `Revenue & Expenses — ${buName}` : "Revenue Analysis"}
            </CardTitle>
            <CardDescription>
              {buId
                ? "Monthly revenue vs. expenses breakdown for this business unit"
                : "Detailed breakdown by selected dimension"}
            </CardDescription>
          </div>
          {!buId && (
            <div className="mr-6 mt-4 sm:mt-0">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[180px] bg-card h-8">
                  <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Group By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_unit">By Business Unit</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="day">By Day</SelectItem>
                  <SelectItem value="week">By Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingRev ? (
            <Skeleton className="h-[350px] w-full" />
          ) : revReport?.data && revReport.data.length > 0 ? (
            <div className="h-[350px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {buId ? (
                  // BU mode: line chart showing revenue vs expenses over time
                  <LineChart data={revReport.data} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `Rp${(v / 1_000_000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatIDR(value)}
                      cursor={{ stroke: "hsl(var(--border))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Net Profit"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  // Holding mode: bar chart by dimension
                  <BarChart data={revReport.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `Rp${(value / 1_000_000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatIDR(value)}
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue" maxBarSize={50}>
                      {revReport.data.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Tidak ada data untuk periode ini.</p>
              {buId && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={clearBuFilter}>
                  Tampilkan semua business unit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
