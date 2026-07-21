import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Shield, Moon, Sun, Monitor } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [theme, setTheme] = useState("system");
  
  // Minimal theme logic for demo purposes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-1">
          <Button variant="secondary" className="w-full justify-start bg-secondary text-secondary-foreground font-medium">
            <User className="w-4 h-4 mr-2" /> Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start hover:bg-muted/50">
            <Monitor className="w-4 h-4 mr-2" /> Appearance
          </Button>
          <Button variant="ghost" className="w-full justify-start hover:bg-muted/50">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start hover:bg-muted/50">
            <Shield className="w-4 h-4 mr-2" /> Security
          </Button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and public profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0 shadow-sm">
                  JD
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" defaultValue="Chief Executive Officer" />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="ceo@solusieradigital.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the command center.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 hover:border-primary transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-8 h-8" />
                  <span className="font-medium text-sm">Light</span>
                </div>
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 hover:border-primary transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-8 h-8" />
                  <span className="font-medium text-sm">Dark</span>
                </div>
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 hover:border-primary transition-colors ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-8 h-8" />
                  <span className="font-medium text-sm">System</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what alerts you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Daily Summary</p>
                  <p className="text-sm text-muted-foreground">Receive a daily performance summary via email.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Large Transactions</p>
                  <p className="text-sm text-muted-foreground">Get alerted when a transaction exceeds Rp 100M.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">New Customers</p>
                  <p className="text-sm text-muted-foreground">Notification on new VIP customer acquisition.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button className="px-8" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
