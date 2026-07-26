import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({
        title: "Login gagal",
        // Supabase returns "Invalid login credentials" for both a wrong
        // password and an unknown email, on purpose: distinguishing them would
        // let an attacker enumerate who has an account.
        description:
          error.message === "Invalid login credentials"
            ? "Email atau password salah."
            : error.message,
        variant: "destructive",
      });
      return;
    }

    setLocation("/");
    toast({
      title: "Welcome back",
      description: "Successfully authenticated to Command Center.",
    });
  };

  return (
    <div className="min-h-[100dvh] w-full flex bg-background">
      <div className="hidden lg:flex flex-1 relative bg-sidebar overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-sidebar to-sidebar z-0" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-sed.png" alt="SED Logo" className="h-12 w-auto" />
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
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="ceo@solusieradigital.com" required className="h-12" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12" />
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

        </div>
      </div>
    </div>
  );
}
