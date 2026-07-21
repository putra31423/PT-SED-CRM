import { useState } from "react";
import { Link } from "wouter";
import { useListBusinessUnits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, Globe, ChevronRight } from "lucide-react";

export default function BusinessUnits() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  
  const { data: units, isLoading } = useListBusinessUnits();

  const filteredUnits = units?.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || unit.category === category;
    return matchesSearch && matchesCategory;
  }) || [];

  const categories = ["Media", "Digital", "Tourism", "Luxury", "Travel Support", "Lifestyle", "Service", "Retail"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Business Units</h2>
          <p className="text-muted-foreground">Manage and monitor all {units?.length || 0} subsidiaries.</p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Building2 className="w-4 h-4 mr-2" />
          Add Business Unit
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search business units..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({length: 8}).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl w-full" />
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No business units found</h3>
          <p className="text-muted-foreground text-center max-w-md mt-2">
            We couldn't find any business units matching your current filters.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => {setSearch(""); setCategory("all");}}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUnits.map((unit) => (
            <Link key={unit.id} href={`/business-units/${unit.id}`}>
              <Card className="hover-elevate cursor-pointer h-full border-none shadow-sm bg-card hover:shadow-md transition-all group overflow-hidden flex flex-col">
                <CardHeader className="pb-3 flex-none relative">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {unit.logoUrl ? (
                        <img src={unit.logoUrl} alt={unit.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="overflow-hidden pr-6">
                      <CardTitle className="text-base truncate" title={unit.name}>{unit.name}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 truncate">
                        {unit.website ? (
                          <div className="flex items-center truncate">
                            <Globe className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">{unit.website.replace(/^https?:\/\//, '')}</span>
                          </div>
                        ) : (
                          <span className="truncate">No website</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-end">
                  <div className="mb-4">
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground font-medium rounded-md">
                      {unit.category}
                    </Badge>
                    {unit.isActive ? (
                      <Badge variant="outline" className="ml-2 border-green-200 text-green-700 bg-green-50 rounded-md">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 border-red-200 text-red-700 bg-red-50 rounded-md">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-auto">
                    {unit.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
