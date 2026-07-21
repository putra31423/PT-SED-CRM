import { useState } from "react";
import { useGetAnalytics, useGetRevenueReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users, BarChart3, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Reports() {
  const [period, setPeriod] = useState("this_month");
  const [groupBy, setGroupBy] = useState("business_unit");

  const { data: analytics, isLoading: isLoadingAnalytics } = useGetAnalytics({ period: period as any });
  const { data: revReport, isLoading: isLoadingRev } = useGetRevenueReport({ period: period as any, groupBy: groupBy as any });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics & Reports</h2>
          <p className="text-muted-foreground">Executive insights and holding-wide performance analysis.</p>
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

      {isLoadingAnalytics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl w-full" />
          <Skeleton className="h-32 rounded-xl w-full" />
          <Skeleton className="h-32 rounded-xl w-full" />
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium mb-1">Holding Revenue Growth</p>
                  <p className="text-3xl font-bold">+{analytics.monthlyGrowth}%</p>
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">Customer Acquisition</p>
                  <p className="text-3xl font-bold text-foreground">+{analytics.customerGrowth}%</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
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
                  <div key={bu.id} className="flex items-center justify-between">
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
                      <p className="text-xs text-green-600">+{bu.growth}%</p>
                    </div>
                  </div>
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
                  <div key={bu.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                        {analytics.topRevenue.length + i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{bu.name}</p>
                        <p className="text-xs text-muted-foreground">{bu.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatIDR(bu.revenue)}</p>
                      <p className={`text-xs ${bu.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {bu.growth >= 0 ? '+' : ''}{bu.growth}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b mb-4">
          <div>
            <CardTitle>Revenue Analysis</CardTitle>
            <CardDescription>Detailed breakdown by selected dimension</CardDescription>
          </div>
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
        </CardHeader>
        <CardContent>
          {isLoadingRev ? (
            <Skeleton className="h-[350px] w-full" />
          ) : revReport?.data ? (
            <div className="h-[350px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revReport.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue" maxBarSize={50}>
                    {revReport.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
