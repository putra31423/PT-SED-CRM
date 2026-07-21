import { useRoute } from "wouter";
import { useGetBusinessUnit, getGetBusinessUnitQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import { Building2, Globe, FileText, TrendingUp, CreditCard, Activity, Users, LayoutDashboard, Calendar, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BusinessUnitDetail() {
  const [, params] = useRoute("/business-units/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: unit, isLoading } = useGetBusinessUnit(id, { 
    query: { enabled: !!id, queryKey: getGetBusinessUnitQueryKey(id) } 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold">Business Unit Not Found</h2>
        <p className="text-muted-foreground mt-2">The business unit you're looking for doesn't exist.</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/business-units">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/business-units" className="hover:text-foreground hover:underline transition-colors flex items-center">
          <ArrowLeft className="w-3 h-3 mr-1" /> Business Units
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{unit.name}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            {unit.logoUrl ? (
              <img src={unit.logoUrl} alt={unit.name} className="w-12 h-12 object-contain" />
            ) : (
              <Building2 className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{unit.name}</h1>
              <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground">
                {unit.category}
              </Badge>
              {unit.isActive ? (
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Inactive</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
              {unit.website && (
                <a href={unit.website.startsWith('http') ? unit.website : `https://${unit.website}`} target="_blank" rel="noreferrer" className="flex items-center hover:text-primary transition-colors">
                  <Globe className="w-4 h-4 mr-1" />
                  {unit.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Est. {new Date(unit.createdAt).getFullYear()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Edit Details</Button>
          <Button>View Reports</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Total Revenue <TrendingUp className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatIDR(unit.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Total Expenses <CreditCard className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatIDR(unit.totalExpenses || 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Net Profit <Activity className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatIDR(unit.netProfit || 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Total Customers <Users className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{unit.totalCustomers || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" /> Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
              <p className="text-muted-foreground text-sm leading-relaxed bg-muted/30 p-4 rounded-lg">
                {unit.description || "No description provided for this business unit."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Projects</h4>
                <p className="text-xl font-medium">{unit.totalProjects || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Invoices</h4>
                <p className="text-xl font-medium">{unit.totalInvoices || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Total Staff</h4>
                <p className="text-xl font-medium">{unit.totalStaff || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Executive Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-sm border border-yellow-200 dark:border-yellow-900/50 min-h-[200px] whitespace-pre-wrap">
              {unit.notes || "No operational notes recorded yet."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
