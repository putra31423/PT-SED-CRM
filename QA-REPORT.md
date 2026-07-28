# Laporan QA + Setup Database — SED Command Center

Tanggal: 26 Juli 2026 · Supabase project: **PT SED CRM DATABASE** (`qtgcwixeegmuyqyduqgd`, `ap-southeast-1`)

---

## Ringkasan

| | |
|---|---|
| Cakupan uji | 11 halaman, 36 endpoint API, 5 tabel |
| Bug ditemukan | **10** |
| Sudah diperbaiki | **5** |
| Perlu keputusan Anda | **5** |
| Uji otomatis akhir | **23/23 lolos** |

---

## Phase 1 — QA

### Yang diperiksa

**Halaman (semua dibuka dengan data nyata, bukan kosong):** Dashboard, Customer Database (CRM),
Customer Detail, Sales Pipeline, Finance Hub (Income/Expenses/P&L/Cashflow), Business Units,
Business Unit Detail, Reports, Settings, Login, Not Found.

**API — 36 endpoint.** 16 endpoint GET di-smoke-test; jalur tulis (POST/PATCH/DELETE) diuji lewat
skrip end-to-end yang menanam data dengan nilai yang diketahui lalu memverifikasi hasil agregasinya.

**Yang diuji spesifik:** agregasi keuangan, penjumlahan `numeric` (Postgres mengembalikannya sebagai
string — sumber klasik bug `"100"+"200"="100200"`), pencarian, filter status, filter business unit,
paginasi, input non-numerik, data tidak ditemukan, integritas foreign key, dan constraint.

---

### Bug yang DIPERBAIKI

#### 1. `updated_at` meleset 8 jam — KRITIS
**Lokasi:** `lib/db/src/schema/*.ts`, seluruh 10 kolom timestamp
**Reproduksi:** buat customer → ubah namanya → bandingkan `created_at` dan `updated_at`
**Hasil salah:** `created=12:17:24Z`, `updated=04:17:24Z` — diperbarui 8 jam *sebelum* dibuat

**Akar masalah:** kolomnya `timestamp without time zone`. `created_at` diisi database lewat
`DEFAULT now()`, sedangkan `updated_at` diisi aplikasi sebagai JavaScript `Date`. Pada kolom tanpa
zona waktu, driver menulis Date memakai jam lokal proses Node, sementara `now()` memakai jam
database. Keduanya jadi berbeda persis sebesar offset zona waktu server.

Dibuktikan terisolasi:

| Tipe kolom | via `now()` | via JS Date | Selisih |
|---|---|---|---|
| `timestamp` | `04:18:58Z` | `20:18:58Z` | **8,0 jam** |
| `timestamptz` | `04:18:58Z` | `04:18:58Z` | 0 |

**Perbaikan:** semua kolom jadi `timestamptz`, yang menyimpan instan absolut sehingga kedua penulis
sepakat di mana pun server berjalan. Migrasi `0001_married_stone_men.sql`.
**Verifikasi:** selisih kini 134 ms (waktu proses wajar), bukan 8 jam.

> Ini akan muncul di produksi. Node berjalan di WIB/WITA, Supabase berjalan di UTC.

#### 2. DELETE data tidak ada mengembalikan sukses
**Lokasi:** `customers.ts`, `deals.ts`, `finance.ts` (income + expenses) — 4 dari 5 route
**Reproduksi:** `DELETE /api/customers/99999999` → `204 No Content`
**Akar masalah:** hasil delete tidak diperiksa. Route `business-units` sudah benar; 4 lainnya tidak konsisten.
**Perbaikan:** tambah `.returning()` + cek 404, mengikuti pola yang sudah ada di `businessUnits.ts`.

#### 3. Jumlah customer diformat sebagai rupiah
**Lokasi:** `dashboard.tsx:103` · **Gejala:** kartu "Active Customers" menampilkan **"Rp 3"**
**Akar masalah:** `renderKpiCard` memformat semua `number` dengan `formatIDR`. Baris di bawahnya
("Transactions") sudah benar mengirim string.
**Perbaikan:** `.toLocaleString()`, menyamakan dengan baris di bawahnya.

#### 4. Probability 0% tidak tampil
**Lokasi:** `sales.tsx:412` · **Gejala:** deal dengan probability 0 menampilkan `0` telanjang, bukan badge `0%`
**Akar masalah:** `{deal.probability && (...)}` — nilai `0` bersifat falsy, React merender angka `0` itu sendiri.
**Perbaikan:** `!= null`. **Verifikasi:** Deal C kini menampilkan `0%`.

#### 5. Tanda ganda `+-2.4%`
**Lokasi:** `reports.tsx:252` · **Gejala:** pertumbuhan negatif tampil `+-2.4%`, berwarna hijau
**Akar masalah:** `+` dan warna hijau dipaksa. Baris 288 di file yang sama sudah benar.
**Perbaikan:** disamakan dengan pola benar tersebut.

---

### Bug yang BELUM diperbaiki — butuh keputusan Anda

#### A. Delapan metrik pertumbuhan adalah data palsu — PALING SERIUS

Enam ditulis mati:

| Lokasi | Nilai | Tampil sebagai |
|---|---|---|
| `dashboard.ts:76` | `revenueGrowth: 18.4` | "+18,4% vs last year" |
| `dashboard.ts:77` | `expenseGrowth: 7.2` | "+7,2% vs last year" |
| `customers.ts:95` | `growth: 12.5` | "+12,5% from last month" |
| `finance.ts:246` | `growth: 15.3` | growth Profit & Loss |
| `reports.ts:122` | `customerGrowth: 23.4` | "+23,4% Customer Acquisition" |
| `reports.ts:123` | `monthlyGrowth: 18.4` | "Revenue Growth (MoM) +18,4%" |

Dua lagi **diacak setiap request**:

```js
reports.ts:109    growth: Math.random() * 30 - 5
dashboard.ts:142  growth: Math.random() * 30 - 5
```

Terbukti: satu business unit menampilkan `-2,4%`, saya refresh, jadi `+24,0%`. Data yang sama.

Ini kelas bug terburuk untuk alat bisnis — bukan crash yang kelihatan, tapi angka karangan yang
tampak otoritatif. Client bisa mengambil keputusan berdasarkan angka ini.

**Kenapa belum saya perbaiki:** butuh keputusan produk — periode pembanding (bulan lalu? tahun
lalu?) dan apa yang ditampilkan saat belum ada data periode sebelumnya. Salah definisi sama
buruknya dengan angka palsu.

#### B. Halaman Settings mengaku menyimpan, padahal tidak
**Lokasi:** `settings.tsx:619`

```js
function handleSave() {
  toast({ title: "Perubahan disimpan",
          description: "Pengaturan Anda telah berhasil diperbarui." });
}
```

Halaman ini 663 baris dengan 4 tab dan beberapa tombol Simpan, dan **tidak mengimpor API client sama
sekali**. Profil (nama, email, HP), notifikasi, dan keamanan tidak tersimpan ke mana pun — hanya
Appearance yang menyimpan satu nilai ke `localStorage`. User diberi tahu datanya tersimpan, padahal dibuang.

**Perlu:** endpoint penyimpanan settings, atau tabel `app_settings`. Ini pekerjaan fitur baru.

#### C. Pelanggaran constraint mengembalikan 500, bukan 400/409
Kategori business unit tidak valid, stage tidak valid, atau menghapus business unit yang masih punya
anak semuanya menghasilkan `500 {"error":"Internal server error"}`.

Catatan jujur: CHECK constraint yang saya tambahkan **membuat ini lebih terlihat**. Sebelumnya
kategori ngawur diterima diam-diam (korupsi data). Sekarang ditolak, tapi dengan pesan yang salah.
Tertolak lebih baik daripada diterima diam-diam, tapi 400/409 lebih baik lagi.

**Perlu:** middleware pemetaan error Postgres → HTTP di `app.ts`.

#### D. Generator `customerId` rusak setelah 9.999 customer
**Lokasi:** `customers.ts` POST — `max(customer_id)` pada kolom `text` membandingkan sebagai string.
`"CUS-9999" > "CUS-10000"` secara leksikografis, jadi setelah menembus 9.999 ID akan terus
menghasilkan `CUS-10000` → pelanggaran unique → 500 permanen.
Juga ada **race condition**: dua POST bersamaan membaca max yang sama.
**Dampak sekarang:** nol. Relevan kalau database tumbuh besar.

#### E. Typecheck masih gagal — memblokir `build` dan deploy
**Lokasi:** `customer-detail.tsx:139`
UI mengirim status gabungan (`"Lead,VIP"`), spec mendeklarasikan enum nilai tunggal. Backend
memfilter dengan `ilike '%...%'` — mengindikasikan multi-status memang disengaja, jadi **spec-nya
yang ketinggalan**. Perlu konfirmasi Anda sebelum saya longgarkan spec dan regenerate client.

---

### Diperiksa, TIDAK bermasalah

Agregasi keuangan akurat (revenue 500.000, expenses 75.000, profit 425.000, margin 85% — cocok
persis dengan data yang ditanam). Tidak ada bug konkatenasi string pada `numeric`. Pencarian
customer, filter status, filter business unit, sentinel `"null"`, dan paginasi semuanya benar.
Input non-numerik pada page/limit tidak membuat 500. Penempatan bulan di grafik revenue benar
(data Juli muncul di Jul). Dropdown filter status lengkap 6 opsi. Nol error console di seluruh
halaman. Format tanggal dan mata uang benar di tabel Finance.

---

## Phase 2 — Database

### Struktur

5 tabel, `snake_case` konsisten, `id serial` sebagai primary key di semua tabel.

```
business_units (11 kolom)  ← puncak hierarki, tanpa FK keluar
   ↑ ↑ ↑ ↑
   │ │ │ └── expenses (12 kolom)
   │ │ └──── income   (13 kolom) ──┐
   │ └────── deals    (14 kolom) ──┤
   └──────── customers(24 kolom) ←─┘
```

| Relasi | Kolom |
|---|---|
| customers → business_units | `business_unit_id` |
| deals → customers, business_units | `customer_id`, `business_unit_id` |
| income → customers, business_units | `customer_id`, `business_unit_id` |
| expenses → business_units | `business_unit_id` |

### Hasil terverifikasi

| Aspek | Jumlah |
|---|---|
| Tabel | 5 |
| Indeks | 30 |
| Foreign key | 6 |
| CHECK constraint | 5 |
| RLS aktif | 5/5 |
| Kolom `timestamptz` | 10 |
| Kolom timestamp naif | **0** |
| Objek terdokumentasi (COMMENT) | 25 |

### Constraint

| Nama | Aturan |
|---|---|
| `business_units_category_valid` | 8 kategori resmi |
| `deals_stage_valid` | Lead/Qualified/Proposal/Negotiation/Won/Lost |
| `deals_probability_range` | NULL atau 0–100 |
| `deals_currency_iso4217` | pola `^[A-Z]{3}$` |
| `income_status_valid` | Pending/Received/Cancelled |

**`customers.status` sengaja TIDAK diberi CHECK.** Halaman customer detail menulis daftar
bergabung koma (`"Lead,VIP"`) dan API mencocokkannya dengan `ILIKE`. Enum CHECK di situ akan
menolak data yang sah hari ini. Alasannya didokumentasikan langsung di kolomnya.

### Keamanan (RLS)

RLS aktif di kelima tabel **tanpa policy** — artinya tolak semua. Ini disengaja: aplikasi mengakses
database lewat Express sebagai pemilik tabel (melewati RLS), sedangkan PostgREST — yang terbuka bagi
siapa pun yang memegang publishable key — diblokir total.

Dibuktikan langsung: sebagai role `anon`, **0 baris terlihat**; sebagai owner, 1 baris terlihat.

Advisor Supabase hanya melaporkan INFO "RLS enabled, no policy" — persis postur yang diinginkan.
Nol temuan level ERROR atau WARN.

> Kalau nanti auth Supabase dipasang dan frontend mengakses database langsung, policy harus ditambahkan.

### Indeks

Semua kolom foreign key terindeks, ditambah kolom yang difilter (`status`, `stage`, `category`,
`date`, `is_active`, `next_follow_up`) dan trigram GIN untuk pencarian customer.

---

## Migrasi yang sudah diterapkan

Ke Supabase, berurutan:

| # | Nama | Isi |
|---|---|---|
| 1 | `enable_pg_trgm_extension` | pg_trgm di schema `extensions` |
| 2 | `initial_crm_schema` | 5 tabel, 6 FK, 5 CHECK, 26 indeks, RLS |
| 3 | `schema_documentation_comments` | 25 COMMENT |
| 4 | `drizzle_migration_bookkeeping` | seed jurnal Drizzle |
| 5 | `timestamps_to_timestamptz` | perbaikan bug timestamp |
| 6 | `record_drizzle_migration_0001` | catat 0001 di jurnal |
| 7 | `realign_drizzle_journal_hash` | selaraskan hash setelah regenerate |

### Cara maintain ke depan

Skema hidup di `lib/db/src/schema/*.ts` sebagai **satu sumber kebenaran**. Alurnya:

```sh
# 1. ubah file skema TypeScript
# 2. buat migrasi SQL berversi (tercatat di git)
pnpm --filter @workspace/db run generate
# 3. terapkan
pnpm --filter @workspace/db run migrate
```

Project ini sebelumnya pakai `push`, yang mendiff langsung ke database tanpa jejak. Sekarang setiap
perubahan skema jadi file SQL yang bisa direview dan di-rollback.

> **Jangan pakai `push` lagi.** Dia akan MENGHAPUS indeks trigram, karena indeks itu tidak
> dideklarasikan di TypeScript — indeks itu butuh ekstensi `pg_trgm`, jadi
> hidup di `lib/db/drizzle/postgres-only/001_trigram_search_indexes.sql`. `migrate` aman: dia hanya
> menerapkan maju dan tidak pernah menghapus objek yang tidak dikenalnya.

---

## Langkah berikutnya

1. **Putuskan soal metrik palsu (temuan A).** Ini yang paling mendesak.
2. **Putuskan soal status multi-nilai (temuan E)** — memblokir `build` dan deploy.
3. Sambungkan aplikasi ke Supabase: ganti `DATABASE_URL` di `.env` dengan connection string project
   `qtgcwixeegmuyqyduqgd`, lalu `pnpm dev`. Tidak ada perubahan kode yang diperlukan.
4. Temuan B (Settings) dan C (kode status HTTP) menyusul sesuai prioritas Anda.
