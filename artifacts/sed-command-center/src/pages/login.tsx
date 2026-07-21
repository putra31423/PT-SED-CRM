import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("sed_user", JSON.stringify({ role: "admin", name: "CEO" }));
      setLocation("/");
      toast({
        title: "Welcome back",
        description: "Successfully authenticated to Command Center.",
      });
    }, 800);
  };

  return (
    <div className="min-h-[100dvh] w-full flex bg-background">
      <div className="hidden lg:flex flex-1 relative bg-sidebar overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-sidebar to-sidebar z-0" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            S
          </div>
          <span className="font-bold text-sidebar-foreground text-2xl tracking-tight">
            SED Command Center
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Enterprise Operating System
          </h1>
          <p className="text-sidebar-foreground/80 text-lg">
            Monitor, analyze, and command 30+ business units from a single source of truth.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sidebar-foreground/60 text-sm">
          <Building2 className="w-4 h-4" />
          PT Solusi Era Digital
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign In</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access the command center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ceo@solusieradigital.com" required className="h-12" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input id="password" type="password" required className="h-12" defaultValue="password" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 bg-card hover:bg-muted" type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-12 bg-card hover:bg-muted" type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
                <path fill="#f25022" d="M0 0h10v10H0z"/>
                <path fill="#7fba00" d="M11 0h10v10H11z"/>
                <path fill="#00a4ef" d="M0 11h10v10H0z"/>
                <path fill="#ffb900" d="M11 11h10v10H11z"/>
              </svg>
              Microsoft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
