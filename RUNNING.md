# Menjalankan SED Command Center di lokal (VS Code)

## Yang dibutuhkan

- Node.js 24 (`node -v`)
- pnpm 11 (`pnpm -v`, atau `npm i -g pnpm`)

Tidak perlu Docker, tidak perlu install Postgres, tidak perlu akun cloud.

## Setup pertama kali

1. **Install dependency**

   ```sh
   pnpm install
   ```

2. **Buat file `.env` di root**

   ```sh
   cp .env.example .env
   ```

   Untuk development lokal, biarkan `DATABASE_URL` memakai `file:` — itu
   menjalankan **PGlite**, yaitu Postgres asli yang dikompilasi ke WASM dan
   berjalan di dalam proses API. Tidak ada server terpisah yang perlu dinyalakan.
   Ganti path-nya menjadi path absolut ke folder repo ini.

3. **Siapkan folder database + buat tabel**

   ```sh
   mkdir -p .data
   pnpm --filter @workspace/db run push
   ```

   `mkdir` wajib — PGlite tidak membuat folder induk secara rekursif.

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
| API      | `pnpm --filter @workspace/api-server run dev`          | <http://localhost:5001> |
| Frontend | `pnpm --filter @workspace/sed-command-center run dev`  | <http://localhost:5173> |

Dev server Vite mem-proxy `/api/*` ke API, jadi frontend tetap memanggil path
relatif persis seperti di Replit — tidak ada kode frontend yang perlu diubah.

### Lewat VS Code

`Terminal → Run Task…` (atau `Cmd+Shift+P` → *Tasks: Run Task*):

- **Dev: all** — jalankan API + frontend sekaligus
- **DB: push schema** — sinkronkan skema ke database
- **Typecheck** — typecheck seluruh workspace

Untuk debugging dengan breakpoint: tab **Run and Debug** → **Debug API server**.

## Pindah ke database sungguhan (Supabase / Neon)

Cukup ganti satu baris di `.env`:

```
DATABASE_URL=postgresql://...
```

Kode memilih driver otomatis berdasarkan skema URL-nya
(lihat [lib/db/src/index.ts](lib/db/src/index.ts)) — tidak ada perubahan kode
lain yang diperlukan. Setelah ganti, jalankan `pnpm --filter @workspace/db run push`
sekali untuk membuat tabel di database baru.

## Catatan penting

- **Port 5000 tidak dipakai di macOS.** AirPlay Receiver (proses `ControlCenter`)
  sudah menguasainya dan akan membalas HTTP 403 yang membingungkan. Kita pakai 5001.
- **API server tidak punya autentikasi.** `app.use("/api", router)` terbuka penuh
  dengan `cors()` tanpa batasan origin.
- **Halaman login masih dummy.** `src/pages/login.tsx` hanya menulis
  `localStorage.sed_user`; input apa pun diterima. Keduanya harus dibereskan
  sebelum deploy ke publik.
- **Database awalnya kosong** — tabel terbentuk tapi belum ada isi.
- **Ubah skema database** lewat file di `lib/db/src/schema/`, lalu jalankan ulang
  `pnpm --filter @workspace/db run push`.
- **Kontrak API** ada di `lib/api-spec/openapi.yaml`. Setelah diubah, regenerate
  client dengan `pnpm --filter @workspace/api-spec run codegen`.
