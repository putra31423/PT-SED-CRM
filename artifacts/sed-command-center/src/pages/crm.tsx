import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCustomers, useGetCustomerStats } from "@workspace/api-client-react";
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
import { Search, Plus, Users, ArrowUpRight, User, Phone, Mail, Building, Clock, X, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  "Lead": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  "Prospect": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "Negotiation": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "Customer": "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  "Repeat Customer": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "VIP": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
};

export default function CRM() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Read ?bu= / ?buName= from URL (deep-link from BU detail page)
  const qp = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const buFromUrl = qp.get("bu") ?? "";
  const buNameFromUrl = decodeURIComponent(qp.get("buName") ?? "");

  const { data: customersData, isLoading } = useListCustomers({ 
    search: search.length > 2 ? search : null,
    status: statusFilter !== "all" ? statusFilter as any : null,
    businessUnitId: buFromUrl ? parseInt(buFromUrl) : undefined,
  });
  
  const { data: stats } = useGetCustomerStats();

  function clearBuFilter() {
    setLocation("/crm");
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
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+62..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="business">Business Name (Optional)</Label>
                <Input id="business" placeholder="Acme Corp" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="Lead">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <Button onClick={() => setIsAddOpen(false)} className="w-full">Save Customer</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium mb-1">Total Database</p>
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
      )}

      <Card className="border-none shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or company..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
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
                customersData.data.map((customer) => (
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
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 mr-2 shrink-0" /> {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 mr-2 shrink-0" /> {customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{customer.businessUnitName || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[customer.status] || ""}>
                        {customer.status}
                      </Badge>
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
