import { useGetDashboardSummary, useGetDashboardRevenueChart, useGetTopBusinessUnits, useGetDashboardCashflow } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Activity, 
  Users, 
  Briefcase,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: chartData, isLoading: isLoadingChart } = useGetDashboardRevenueChart();
  const { data: topBU, isLoading: isLoadingTop } = useGetTopBusinessUnits();
  const { data: cashflow, isLoading: isLoadingCashflow } = useGetDashboardCashflow();

  const renderKpiCard = (
    title: string,
    value: string | number,
    icon: any,
    subtext?: string,
    trend?: number,
    href?: string,
  ) => {
    const inner = (
      <Card className={`transition-all border-none shadow-sm bg-card ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer group" : "hover-elevate"}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-1">
            {icon}
            {href && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? formatIDR(value) : value}
          </div>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {trend !== undefined && (
                <span className={`flex items-center mr-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
              )}
              {subtext}
            </p>
          )}
        </CardContent>
      </Card>
    );

    if (href) {
      return <Link href={href} className="block">{inner}</Link>;
    }
    return inner;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Executive Overview</h2>
          <p className="text-muted-foreground">Monitor your holding company's performance metrics.</p>
        </div>
      </div>

      {isLoadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({length: 8}).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {renderKpiCard("Total Revenue (YTD)", summary.totalRevenue, <DollarSign className="h-4 w-4 text-primary" />, "vs last year", summary.revenueGrowth, "/finance/income")}
          {renderKpiCard("Net Profit", summary.netProfit, <TrendingUp className="h-4 w-4 text-green-500" />, `Profit Margin: ${summary.profitMargin.toFixed(2)}%`, undefined, "/reports")}
          {renderKpiCard("Cashflow", cashflow?.netCashflow ?? 0, <Activity className="h-4 w-4 text-blue-500" />, "Net cashflow (all-time)", undefined, "/finance/cashflow")}
          {renderKpiCard("Total Expenses", summary.totalExpenses, <CreditCard className="h-4 w-4 text-red-500" />, "vs last year", summary.expenseGrowth, "/finance/expenses")}

          {renderKpiCard("Today's Revenue", summary.todayRevenue, <DollarSign className="h-4 w-4 text-primary" />, "Real-time", undefined, "/finance/income")}
          {renderKpiCard("Monthly Revenue", summary.monthlyRevenue, <Briefcase className="h-4 w-4 text-primary" />, "This month", undefined, "/finance/income")}
          {renderKpiCard("Active Customers", summary.totalCustomers, <Users className="h-4 w-4 text-blue-500" />, "Across all units", undefined, "/crm")}
          {renderKpiCard("Transactions", summary.totalTransactions.toLocaleString(), <Activity className="h-4 w-4 text-primary" />, "Total count", undefined, "/finance/income")}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly performance across all business units</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {isLoadingChart ? (
              <Skeleton className="h-[350px] w-full ml-4" />
            ) : chartData ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Top Business Units</CardTitle>
            <CardDescription>By Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTop ? (
              <Skeleton className="h-[350px] w-full" />
            ) : topBU ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBU} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                    />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip 
                      formatter={(value: number) => formatIDR(value)}
                      cursor={{fill: 'hsl(var(--muted))'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Cashflow Forecast</CardTitle>
          <CardDescription>Next 30 Days Overview</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoadingCashflow ? (
             <Skeleton className="h-[80px] w-full" />
           ) : cashflow ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                 <p className="text-sm text-muted-foreground mb-1">Bank Balance</p>
                 <p className="text-xl font-bold">{formatIDR(cashflow.bankBalance)}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">Net Cashflow</p>
                 <p className={`text-xl font-bold ${cashflow.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {formatIDR(cashflow.netCashflow)}
                 </p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">Outstanding Invoices</p>
                 <p className="text-xl font-bold text-primary">{formatIDR(cashflow.outstandingInvoices)}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">Outstanding Expenses</p>
                 <p className="text-xl font-bold text-destructive">{formatIDR(cashflow.outstandingExpenses)}</p>
               </div>
             </div>
           ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
