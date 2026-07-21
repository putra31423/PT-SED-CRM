import { useRoute } from "wouter";
import { useGetCustomer, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Mail, Phone, MapPin, Building, Globe, 
  Calendar, Briefcase, FileText, CheckCircle2, MessageSquare,
  Facebook, Instagram, Tag,
  Clock,
  Plus,
  User
} from "lucide-react";

const statusColors: Record<string, string> = {
  "Lead": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  "Prospect": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "Negotiation": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "Customer": "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  "Repeat Customer": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "VIP": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
};

export default function CustomerDetail() {
  const [, params] = useRoute("/crm/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: customer, isLoading } = useGetCustomer(id, { 
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) } 
  });

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/crm" className="hover:text-foreground hover:underline transition-colors flex items-center">
          <ArrowLeft className="w-3 h-3 mr-1" /> Customer Database
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{customer.fullName}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start justify-between">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0 shadow-sm">
            {customer.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{customer.fullName}</h1>
              <Badge variant="outline" className={statusColors[customer.status] || ""}>
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
          <Button>Edit Profile</Button>
          <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5">Log Interaction</Button>
        </div>
      </div>

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
                    <span className="text-sm font-medium block">{customer.address}</span>
                    <span className="text-sm font-medium text-muted-foreground">{customer.country}</span>
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Notes & Interactions</CardTitle>
              <Button variant="ghost" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Note</Button>
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
                        ? new Date(customer.nextFollowUp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : "No follow up scheduled"}
                    </p>
                  </div>
                </div>
                {customer.nextFollowUp && (
                  <Button variant="outline" size="sm">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Done
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
    </div>
  );
}
