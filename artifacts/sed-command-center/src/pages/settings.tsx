import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Bell, Shield, Moon, Sun, Monitor,
  Lock, Eye, EyeOff, Smartphone, AlertTriangle,
  Mail, MessageSquare, TrendingUp, DollarSign, Users,
  Upload, Trash2, Camera,
} from "lucide-react";

type Section = "profile" | "appearance" | "notifications" | "security";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User    },
  { id: "appearance",   label: "Appearance",    icon: Monitor  },
  { id: "notifications",label: "Notifications", icon: Bell     },
  { id: "security",     label: "Security",      icon: Shield   },
];

// ── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection({ onSave }: { onSave: () => void }) {
  const [name, setName]   = useState("Admin SED");
  const [title, setTitle] = useState("Chief Executive Officer");
  const [email, setEmail] = useState("ceo@solusieradigital.com");
  const [phone, setPhone] = useState("+62 811 2345 6789");
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem("sed-avatar"));
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  function processFile(file: File) {
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast({ title: "Format tidak didukung", description: "Gunakan JPG, PNG, GIF, atau WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 800 * 1024) {
      toast({ title: "File terlalu besar", description: `Ukuran file ${(file.size / 1024).toFixed(0)} KB melebihi batas 800 KB.`, variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem("sed-avatar", dataUrl);
      toast({ title: "Avatar berhasil diubah ✓" });
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function removeAvatar() {
    setAvatar(null);
    localStorage.removeItem("sed-avatar");
    toast({ title: "Avatar dihapus" });
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details and public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar upload area */}
          <div className="flex items-start gap-6">
            {/* Avatar preview */}
            <div className="relative group shrink-0">
              <div
                className={`w-24 h-24 rounded-full overflow-hidden shadow-md border-2 transition-colors ${
                  dragOver ? "border-primary border-dashed" : "border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
              </div>
              {/* Overlay on hover */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title="Ganti avatar"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Upload actions */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Pilih Foto
                </Button>
                {avatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                JPG, PNG, GIF atau WebP · Maks <strong>800 KB</strong>
                <br />Drag &amp; drop foto langsung ke foto profil, atau klik <em>Pilih Foto</em>.
              </p>
              {/* Drop zone hint */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <Upload className="w-5 h-5 mx-auto mb-1 opacity-60" />
                <p className="text-xs">Drag &amp; drop foto di sini</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Jabatan</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Nomor HP / WhatsApp</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Informasi Perusahaan</CardTitle>
          <CardDescription>Detail holding PT Solusi Era Digital.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Nama Perusahaan</Label>
              <Input defaultValue="PT Solusi Era Digital" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input defaultValue="Asia/Makassar (WITA, UTC+8)" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Mata Uang Default</Label>
              <Input defaultValue="IDR – Rupiah Indonesia" readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label>Bahasa</Label>
              <Input defaultValue="Bahasa Indonesia" readOnly className="bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8" onClick={onSave}>Simpan Profil</Button>
      </div>
    </div>
  );
}

// ── Appearance Section ───────────────────────────────────────────────────────
function AppearanceSection({ onSave }: { onSave: () => void }) {
  const [theme, setTheme]       = useState(() => localStorage.getItem("sed-theme") || "system");
  const [density, setDensity]   = useState(() => localStorage.getItem("sed-density") || "comfortable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(sys);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("sed-theme", theme);
  }, [theme]);

  function handleSave() {
    localStorage.setItem("sed-density", density);
    onSave();
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Mode Tampilan</CardTitle>
          <CardDescription>Pilih skema warna yang nyaman untuk Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {([
              { id: "light",  label: "Light",  Icon: Sun     },
              { id: "dark",   label: "Dark",   Icon: Moon    },
              { id: "system", label: "System", Icon: Monitor },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 transition-colors ${
                  theme === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className="w-8 h-8" />
                <span className="font-medium text-sm">{label}</span>
                {theme === id && <Badge className="text-xs px-2 py-0">Aktif</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Kepadatan Tampilan</CardTitle>
          <CardDescription>Atur seberapa rapat data ditampilkan di tabel dan list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {(["compact", "comfortable", "spacious"] as const).map(d => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer ${
                  density === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="space-y-1 w-full">
                  {Array.from({ length: d === "compact" ? 4 : d === "comfortable" ? 3 : 2 }).map((_, i) => (
                    <div key={i} className={`h-1.5 bg-current rounded opacity-40 ${d === "spacious" ? "mb-2" : ""}`} />
                  ))}
                </div>
                <span className="font-medium text-sm capitalize">{d === "compact" ? "Padat" : d === "comfortable" ? "Normal" : "Lega"}</span>
                {density === d && <Badge className="text-xs px-2 py-0">Aktif</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Sidebar</CardTitle>
          <CardDescription>Preferensi panel navigasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Collapse Sidebar saat startup</p>
              <p className="text-sm text-muted-foreground">Sidebar otomatis diperkecil saat pertama buka.</p>
            </div>
            <Switch checked={sidebarCollapsed} onCheckedChange={setSidebarCollapsed} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8" onClick={handleSave}>Simpan Tampilan</Button>
      </div>
    </div>
  );
}

// ── Notifications Section ────────────────────────────────────────────────────
function NotificationsSection({ onSave }: { onSave: () => void }) {
  const [prefs, setPrefs] = useState({
    dailySummary:      true,
    largeTx:           true,
    newCustomer:       false,
    dealWon:           true,
    dealLost:          false,
    lowCashflow:       true,
    emailEnabled:      true,
    whatsappEnabled:   false,
    browserEnabled:    true,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }));

  const notifItems: { key: keyof typeof prefs; icon: React.ElementType; label: string; desc: string }[] = [
    { key: "dailySummary",    icon: TrendingUp,    label: "Ringkasan Harian",        desc: "Laporan kinerja harian dikirim tiap pagi." },
    { key: "largeTx",         icon: DollarSign,    label: "Transaksi Besar",         desc: "Alert saat transaksi melebihi Rp 100 juta." },
    { key: "newCustomer",     icon: Users,         label: "Customer Baru",           desc: "Notifikasi saat ada customer VIP baru." },
    { key: "dealWon",         icon: TrendingUp,    label: "Deal Berhasil (Won)",      desc: "Notifikasi saat deal berhasil ditutup." },
    { key: "dealLost",        icon: AlertTriangle, label: "Deal Gagal (Lost)",        desc: "Notifikasi saat deal dinyatakan hilang." },
    { key: "lowCashflow",     icon: AlertTriangle, label: "Cashflow Rendah",         desc: "Peringatan saat cashflow mendekati batas minimum." },
  ];

  const channels: { key: keyof typeof prefs; icon: React.ElementType; label: string; desc: string }[] = [
    { key: "emailEnabled",    icon: Mail,          label: "Email",                   desc: "Kirim notifikasi ke email terdaftar." },
    { key: "whatsappEnabled", icon: MessageSquare, label: "WhatsApp",                desc: "Notifikasi via pesan WhatsApp." },
    { key: "browserEnabled",  icon: Monitor,       label: "Browser Push",            desc: "Notifikasi langsung di browser." },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Jenis Notifikasi</CardTitle>
          <CardDescription>Pilih event apa yang ingin Anda pantau.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifItems.map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Saluran Pengiriman</CardTitle>
          <CardDescription>Tentukan bagaimana notifikasi dikirimkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {channels.map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8" onClick={onSave}>Simpan Notifikasi</Button>
      </div>
    </div>
  );
}

// ── Security Section ─────────────────────────────────────────────────────────
function SecuritySection({ onSave }: { onSave: () => void }) {
  const [showOld, setShowOld]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPw, setOldPw]           = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [twoFA, setTwoFA]           = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const { toast } = useToast();

  const sessions = [
    { device: "Chrome – MacBook Pro",  location: "Denpasar, Bali",    time: "Sekarang",        current: true },
    { device: "Safari – iPhone 15",    location: "Denpasar, Bali",    time: "2 jam lalu",      current: false },
    { device: "Chrome – Windows PC",   location: "Jakarta, Indonesia", time: "Kemarin 14:30",   current: false },
  ];

  function handleChangePassword() {
    if (!oldPw || !newPw || !confirmPw) {
      toast({ title: "Lengkapi semua field password", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Password baru tidak cocok", variant: "destructive" });
      return;
    }
    if (newPw.length < 8) {
      toast({ title: "Password minimal 8 karakter", variant: "destructive" });
      return;
    }
    setOldPw(""); setNewPw(""); setConfirmPw("");
    onSave();
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>Gunakan password yang kuat dan unik.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Password Lama</Label>
            <div className="relative">
              <Input
                type={showOld ? "text" : "password"}
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowOld(v => !v)}
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Password Baru</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew(v => !v)}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="flex gap-1 mt-1">
                {[newPw.length >= 8, /[A-Z]/.test(newPw), /[0-9]/.test(newPw), /[^a-zA-Z0-9]/.test(newPw)].map((ok, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? "bg-green-500" : "bg-muted"}`} />
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Konfirmasi Password Baru</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Ulangi password baru"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(v => !v)}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button onClick={handleChangePassword} className="w-full sm:w-auto">
            <Lock className="w-4 h-4 mr-2" /> Update Password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Autentikasi Dua Faktor (2FA)</CardTitle>
          <CardDescription>Tambah lapisan keamanan ekstra pada akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">Google Authenticator, Authy, dsb.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {twoFA && <Badge className="bg-green-100 text-green-700 border-green-200">Aktif</Badge>}
              <Switch checked={twoFA} onCheckedChange={setTwoFA} />
            </div>
          </div>
          {twoFA && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Scan QR code di aplikasi authenticator Anda untuk mengaktifkan 2FA. Fitur ini akan tersedia setelah koneksi ke backend autentikasi dikonfigurasi.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Session Aktif</CardTitle>
          <CardDescription>Perangkat yang sedang login ke akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.current ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <div>
                  <p className="font-medium text-sm">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
                </div>
              </div>
              {s.current ? (
                <Badge variant="outline" className="border-green-200 text-green-700 text-xs">Saat ini</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                  onClick={() => toast({ title: `Session ${s.device} telah diakhiri` })}
                >
                  Akhiri
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const [active, setActive] = useState<Section>("profile");
  const { toast } = useToast();

  function handleSave() {
    toast({
      title: "Perubahan disimpan",
      description: "Pengaturan Anda telah berhasil diperbarui.",
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h2>
        <p className="text-muted-foreground">Kelola akun dan preferensi sistem Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <nav className="md:col-span-1 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={active === id ? "secondary" : "ghost"}
              className={`w-full justify-start transition-colors ${
                active === id
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setActive(id)}
            >
              <Icon className="w-4 h-4 mr-2 shrink-0" />
              {label}
            </Button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="md:col-span-3">
          {active === "profile"       && <ProfileSection       onSave={handleSave} />}
          {active === "appearance"   && <AppearanceSection    onSave={handleSave} />}
          {active === "notifications" && <NotificationsSection onSave={handleSave} />}
          {active === "security"     && <SecuritySection      onSave={handleSave} />}
        </div>
      </div>
    </div>
  );
}
