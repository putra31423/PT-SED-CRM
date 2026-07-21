import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  PieChart,
  Settings,
  LogOut,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const navGroups = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Finance",
    items: [
      { title: "Finance Hub", url: "/finance", icon: Wallet },
    ],
  },
  {
    title: "CRM",
    items: [
      { title: "Customer Database", url: "/crm", icon: Users },
      { title: "Sales Pipeline", url: "/sales", icon: Target },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Business Units", url: "/business-units", icon: Building2 },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Reports", url: "/reports", icon: PieChart },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("sed_user");
    setLocation("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="flex items-center justify-between px-4 py-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shrink-0">
                S
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sidebar-foreground truncate text-sm leading-tight">
                  SED
                </span>
                <span className="text-xs text-sidebar-foreground/70 truncate">
                  Command Center
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                          tooltip={item.title}
                        >
                          <Link href={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter>
            <div className="p-4 pt-0 group-data-[collapsible=icon]:p-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </div>
            <div className="flex items-center gap-3 p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium shrink-0">
                JD
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                <span className="text-sm font-medium text-sidebar-foreground truncate">John Doe</span>
                <span className="text-xs text-sidebar-foreground/70 truncate">CEO</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-card text-card-foreground transition-all duration-300">
          <div className="h-14 border-b border-border flex items-center px-4 bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-4 font-medium text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              System Status: Nominal
            </div>
          </div>
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
