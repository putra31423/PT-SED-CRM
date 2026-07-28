# Menjalankan SED Command Center di lokal (VS Code)

## Yang dibutuhkan

- Node.js 24 (`node -v`)
- pnpm 10.30.3 (`corepack enable && corepack prepare pnpm@10.30.3 --activate`)
- Akses ke database Supabase project ini

## Setup pertama kali

1. **Install dependency**

   ```sh
   pnpm install
   ```

2. **Buat file `.env` di root**

   ```sh
   cp .env.example .env
   ```

   Isi `DATABASE_URL` dengan connection string Supabase: **Connect → Direct →
   Connection Method: Session pooler → Type: URI** (port **5432**). Ganti
   `[YOUR-PASSWORD]` dengan password database, dan URL-encode karakter spesial
   di dalamnya (`@` → `%40`, `#` → `%23`, `%` → `%25`).

   Isi juga `SUPABASE_URL`, `VITE_SUPABASE_URL`, dan
   `VITE_SUPABASE_PUBLISHABLE_KEY` — semuanya bukan rahasia.

   > Port **5432** untuk lokal. Vercel memakai **6543** (Transaction pooler)
   > karena serverless membuka koneksi baru tiap request.

3. **Buat tabelnya** (hanya sekali per database baru)

   ```sh
   pnpm --filter @workspace/db run migrate
   ```

## Menjalankan

Satu perintah dari root, mirip tombol Run di Replit:

```sh
pnpm dev
```

Lalu buka <http://localhost:5173>.

Di balik layar ini menyalakan **dua proses**, karena di lokal tidak ada
application router seperti punya Replit yang menyatukan keduanya di satu port:

| Proses   | Perintah                                              | URL                     |
| -------- | ----------------------------------------------------- | ----------------------- |
| API      | `pnpm --filter @workspace/api-server run dev`         | <http://localhost:5001> |
| Frontend | `pnpm --filter @workspace/sed-command-center run dev` | <http://localhost:5173> |

Dev server Vite mem-proxy `/api/*` ke API, jadi frontend tetap memanggil path
relatif persis seperti di Replit — tidak ada kode frontend yang perlu diubah.

### Lewat VS Code

`Terminal → Run Task…` (atau `Cmd+Shift+P` → _Tasks: Run Task_):

- **Dev: all** — jalankan API + frontend sekaligus
- **DB: push schema** — sinkronkan skema ke database
- **Typecheck** — typecheck seluruh workspace

Untuk debugging dengan breakpoint: tab **Run and Debug** → **Debug API server**.

## Mengganti koneksi database

Cukup ganti satu baris di `.env`:

```
DATABASE_URL=postgresql://...
```

API memakai PostgreSQL melalui `pg`/Drizzle (lihat `lib/db/src/index.ts`). Setelah
beralih ke database baru, jalankan migrasi sebelum membuka aplikasi.

## Catatan penting

- **Port 5000 tidak dipakai di macOS.** AirPlay Receiver (proses `ControlCenter`)
  sudah menguasainya dan akan membalas HTTP 403 yang membingungkan. Kita pakai 5001.
- **API memakai Supabase Auth.** User harus memiliki
  `app_metadata.crm_access=true`; lihat `AUTH.md` untuk menambah staff.
- **CORS default same-origin.** Isi `CORS_ORIGIN` hanya bila frontend berjalan
  pada origin yang berbeda dari API.
- **Database awalnya kosong** — tabel terbentuk tapi belum ada isi.
- **Ubah skema database** lewat file di `lib/db/src/schema/`, lalu jalankan ulang
  `pnpm --filter @workspace/db run push`.
- **Kontrak API** ada di `lib/api-spec/openapi.yaml`. Setelah diubah, regenerate
  client dengan `pnpm --filter @workspace/api-spec run codegen`.
