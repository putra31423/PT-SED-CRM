# Deploy ke Vercel

Seluruh sistem berjalan di **satu project Vercel** — tidak perlu VPS, tidak perlu Railway.

| Bagian | Di mana | Biaya |
|---|---|---|
| Frontend (React/Vite) | Vercel — file statis | gratis |
| API (Express) | Vercel — serverless function | gratis |
| Database (Postgres) | Supabase | gratis |

## Cara kerjanya

`artifacts/api-server/src/app.ts` membangun aplikasi Express tapi tidak pernah memanggil `listen()`.
Ada dua pintu masuk yang memakai aplikasi yang sama persis:

```
api/[...path].ts                     → dipakai Vercel (ekspor app sebagai handler)
artifacts/api-server/src/index.ts    → dipakai lokal (menambahkan listen())
```

Karena keduanya memuat `app.ts` yang identik, tidak ada jalur kode khusus serverless yang bisa
menyimpang dari yang kamu uji di lokal.

Nama file `[...path].ts` membuat setiap request `/api/*` masuk ke sini dengan URL aslinya utuh,
sehingga router `app.use("/api", ...)` cocok persis seperti di lokal.

## Langkah deploy

### 1. Push ke GitHub

Vercel men-deploy dari repository.

### 2. Import di Vercel

Dashboard Vercel → **Add New → Project** → pilih repo ini.

Biarkan semua setelan default — `vercel.json` sudah mengatur build command, output directory, dan
konfigurasi function.

### 3. Isi environment variable

**Settings → Environment Variables**, sebelum deploy pertama:

| Name | Value | Environment |
|---|---|---|
| `DATABASE_URL` | connection string **Transaction pooler** | Production |

> **Wajib Transaction pooler (port 6543), bukan Session pooler.**
> Serverless membuat koneksi baru tiap request dan mematikannya tanpa menutup rapi. Session pooler
> akan kehabisan slot dan mulai menolak koneksi begitu trafik naik — errornya baru muncul setelah
> live, jadi sulit dilacak. Transaction pooler dirancang untuk pola ini.
>
> Ambil di Supabase → **Connect** → **Direct** → Connection Method: **Transaction pooler** → Type: **URI**.

`PORT` tidak perlu diisi — serverless tidak memakai port.

### 4. Deploy

Kalau env var ditambahkan setelah deploy pertama, harus **redeploy** — Vercel tidak memuat ulang
environment variable ke deployment yang sudah berjalan.

## Perbedaan lokal vs produksi

| | Lokal | Vercel |
|---|---|---|
| Database | Supabase | Supabase (sama) |
| Pooler | Session (5432) | **Transaction (6543)** |
| Proses API | server hidup terus | serverless per request |
| Frontend | Vite dev server | file statis + CDN |

Lokal dan produksi memakai database yang sama, jadi data yang diinput lewat localhost ikut terlihat
di versi deploy. Yang berbeda hanya pooler-nya.

## Catatan teknis

**Kenapa PGlite dicabut.** Sempat ada dukungan PGlite (Postgres WASM) supaya bisa jalan tanpa
database sama sekali. Itu dihapus karena `drizzle-orm/pglite` mengimpor PGlite secara **statis** —
jadi walaupun kode kita memuatnya lewat `import()` dinamis, bundler tetap mengangkatnya ke atas dan
mengevaluasinya saat modul dimuat. Hasilnya `FUNCTION_INVOCATION_FAILED` di Vercel, bahkan pada
`/api/healthz` yang tidak menyentuh database sama sekali.

PGlite juga penyebab `drizzle-orm` ter-install dua kali (peer context terpisah), yang memunculkan
error tipe "separate declarations of a private property". Satu paket, dua kegagalan build berbeda.

Terverifikasi setelah dicabut: **0 file PGlite** di bundle function, function berhasil dimuat, dan
menjawab `/api/healthz` → 200 serta `/api/customers` tanpa token → 401.

**Cold start.** Request pertama setelah idle memakan sekitar 1–3 detik. Untuk CRM internal biasanya
tidak masalah.

**Timeout.** Diset 30 detik di `vercel.json`. Plan gratis Vercel membatasi maksimum 10 detik —
naikkan plan atau turunkan nilainya kalau kena limit.

## Sebelum dipakai client — WAJIB

Dua hal ini sudah dilaporkan di `QA-REPORT.md` dan **belum dikerjakan**:

1. **Tidak ada autentikasi sama sekali.** `app.ts` memasang `app.use("/api", router)` tanpa
   middleware auth, dengan `cors()` terbuka penuh tanpa batasan origin. Begitu URL-nya online,
   siapa pun yang mengetahuinya bisa membaca dan menghapus seluruh data CRM.
2. **Halaman login masih dummy.** `src/pages/login.tsx` hanya menulis `localStorage`; input apa pun
   diterima.

Jangan berikan URL produksi ke client sebelum keduanya beres.
