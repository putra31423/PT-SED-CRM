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
| Database | PGlite (`DATABASE_URL=file:...`) | Supabase |
| Pooler | Session (5432) | **Transaction (6543)** |
| Proses API | server hidup terus | serverless per request |
| Frontend | Vite dev server | file statis + CDN |

Pemilihan driver terjadi otomatis di `lib/db/src/index.ts` berdasarkan skema URL — `file:` memakai
PGlite, selain itu Postgres biasa. Tidak ada kode yang perlu diubah saat berpindah.

## Catatan teknis

**PGlite tidak ikut ter-bundle.** `lib/db/src/index.ts` memuat PGlite lewat `import()` dinamis, bukan
import statis. Import statis akan menyeret puluhan megabyte WebAssembly ke dalam function — cukup
untuk menembus batas ukuran Vercel — padahal produksi tidak pernah memakainya.

Terverifikasi lewat simulasi bundling: **0 aset `.wasm`/`.data`**, ukuran function **3,06 MB** (batas
Vercel 250 MB).

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
