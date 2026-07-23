import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useListIncome, useListExpenses, useGetProfitLoss, useGetCashflowDetail, useListBusinessUnits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/utils";
import { Plus, Search, Calendar as CalendarIcon, Download, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";

export default function FinanceHub() {
  const [match, params] = useRoute("/finance/:tab?");
  const [, setLocation] = useLocation();
  const tab = params?.tab || "income";

  // Shared state for filters
  const [buFilter, setBuFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("this_month");
  
  const { data: businessUnits } = useListBusinessUnits();

  const handleTabChange = (value: string) => {
    setLocation(`/finance/${value}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Finance Hub</h2>
          <p className="text-muted-foreground">Manage cashflow, track transactions, and analyze profitability.</p>
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
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>

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

function IncomeTab({ buFilter, businessUnits }: { buFilter: number | null; businessUnits: { id: number; name: string }[] }) {
  const [search, setSearch] = useState("");
  const { data: incomeList, isLoading } = useListIncome({ businessUnitId: buFilter });
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Card className="border-none shadow-sm">
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 justify-between items-center rounded-t-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search invoice, customer, or desc..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Income
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Record New Income</SheetTitle>
            </SheetHeader>
            <div className="grid gap-6 py-6">
              {/* Form fields mockup */}
              <div className="space-y-4">
                <div className="grid gap-2"><label className="text-sm font-medium">Amount</label><Input type="number" placeholder="Rp 0" /></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Date</label><Input type="date" /></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Business Unit</label><Select><SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger><SelectContent>{businessUnits.map(bu => (<SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Description</label><Input placeholder="Invoice payment..." /></div>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsAddOpen(false)}>Save Income</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : incomeList?.data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-sm">{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{item.invoiceNumber || "—"}</TableCell>
                <TableCell>{item.businessUnitName || "—"}</TableCell>
                <TableCell>{item.customerName || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="bg-secondary/10">{item.category || "General"}</Badge></TableCell>
                <TableCell className="text-right font-bold text-green-600">{formatIDR(item.amount)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={
                    item.status === 'Received' ? 'border-green-200 text-green-700 bg-green-50' : 
                    item.status === 'Pending' ? 'border-amber-200 text-amber-700 bg-amber-50' : ''
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
  const { data: expenseList, isLoading } = useListExpenses({ businessUnitId: buFilter });
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Card className="border-none shadow-sm">
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 justify-between items-center rounded-t-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search vendor, receipt, or desc..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
          <SheetTrigger asChild>
            <Button className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Expense
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Record New Expense</SheetTitle>
            </SheetHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-4">
                <div className="grid gap-2"><label className="text-sm font-medium">Amount</label><Input type="number" placeholder="Rp 0" /></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Date</label><Input type="date" /></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Business Unit</label><Select><SelectTrigger><SelectValue placeholder="Pilih Business Unit" /></SelectTrigger><SelectContent>{businessUnits.map(bu => (<SelectItem key={bu.id} value={bu.id.toString()}>{bu.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Vendor</label><Input placeholder="Supplier name..." /></div>
                <div className="grid gap-2"><label className="text-sm font-medium">Description</label><Input placeholder="Office supplies..." /></div>
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => setIsAddOpen(false)}>Save Expense</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Receipt #</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : expenseList?.data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-sm">{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{item.receiptNumber || "—"}</TableCell>
                <TableCell>{item.businessUnitName || "—"}</TableCell>
                <TableCell>{item.vendor || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="bg-secondary/10">{item.category || "General"}</Badge></TableCell>
                <TableCell className="text-right font-bold text-red-600">{formatIDR(item.amount)}</TableCell>
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
