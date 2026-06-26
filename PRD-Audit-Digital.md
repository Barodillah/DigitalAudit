# Product Requirements Document
# Aplikasi Audit Digital

**Versi:** 1.0.0
**Tanggal:** Juni 2025
**Status:** Draft

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Tujuan Produk](#2-tujuan-produk)
3. [Pengguna & Peran](#3-pengguna--peran)
4. [Struktur Database](#4-struktur-database)
5. [Backend Requirements](#5-backend-requirements)
6. [Frontend Requirements](#6-frontend-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Roadmap](#8-roadmap)

---

## 1. Overview

Aplikasi Audit Digital adalah platform berbasis web untuk mengelola, melaksanakan, dan mendokumentasikan kegiatan audit secara terstruktur. Sistem mendukung hierarki kategori yang sepenuhnya dinamis — jumlah dan nama level sub-kategori dapat dikonfigurasi per template audit tanpa perubahan kode. Setiap item audit di level terdalam dapat dilampiri bukti digital (foto, PDF, dokumen) sebagai evidence.

### Masalah yang Diselesaikan

- Proses audit yang masih manual / berbasis spreadsheet sulit dilacak dan diverifikasi
- Struktur kategori audit berbeda-beda antar departemen atau proyek
- Pengumpulan bukti audit tersebar dan tidak terorganisir
- Tidak ada audit trail yang jelas siapa mengisi apa dan kapan

---

## 2. Tujuan Produk

| Tujuan | Indikator Keberhasilan |
|--------|------------------------|
| Mendigitalisasi proses audit end-to-end | 100% item audit tercatat dalam sistem |
| Mendukung struktur kategori dinamis | Template bisa dikonfigurasi tanpa deploy ulang |
| Memudahkan pengumpulan evidence | Upload file langsung dari mobile maupun desktop |
| Memberikan visibilitas progress audit | Dashboard real-time per audit session |
| Menjamin audit trail yang lengkap | Semua aksi tercatat dengan timestamp dan user |

---

## 3. Pengguna & Peran

| Peran | Deskripsi | Akses |
|-------|-----------|-------|
| **Super Admin** | Mengelola sistem, user, dan konfigurasi global | Full access |
| **Admin** | Membuat dan mengelola template audit | Template, kategori, item |
| **Auditor** | Melaksanakan audit dan mengisi hasil beserta evidence | Audit session yang ditugaskan |
| **Reviewer** | Mereview hasil audit, tidak bisa mengubah | Read-only + komentar |
| **Viewer** | Melihat laporan dan dashboard | Read-only |

---

## 4. Struktur Database

Menggunakan pendekatan **Adjacency List** untuk hierarki dinamis — satu tabel `audit_categories` merepresentasikan semua level dengan kolom `parent_id` yang self-referencing.

### 4.1 Tabel Utama

#### `dealers`
Master data diler atau cabang tempat audit akan dilakukan.

```sql
CREATE TABLE dealers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `audit_templates`
Master template audit yang mendefinisikan jenis dan struktur audit.

```sql
CREATE TABLE audit_templates (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_by   BIGINT REFERENCES users(id),
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

#### `audit_level_configs`
Mendefinisikan nama/label setiap level hierarki per template. Inilah yang membuat level bersifat dinamis.

```sql
CREATE TABLE audit_level_configs (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    template_id  BIGINT NOT NULL REFERENCES audit_templates(id),
    level        INT NOT NULL,           -- 0, 1, 2, 3, dst
    label        VARCHAR(100) NOT NULL,  -- "Parameter", "Sub Parameter", "Group", dst
    is_required  BOOLEAN DEFAULT TRUE,
    sort_order   INT DEFAULT 0,
    UNIQUE (template_id, level)
);
```

**Contoh data:**
```
template_id | level | label
1           | 0     | Parameter
1           | 1     | Sub Parameter
1           | 2     | Group
```

#### `audit_categories`
Hierarki kategori audit. Satu tabel untuk semua level dengan self-referencing `parent_id`.

```sql
CREATE TABLE audit_categories (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    template_id  BIGINT NOT NULL REFERENCES audit_templates(id),
    parent_id    BIGINT NULL REFERENCES audit_categories(id),
    level        INT NOT NULL,
    name         VARCHAR(255) NOT NULL,
    sort_order   INT DEFAULT 0,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cat_parent ON audit_categories(parent_id);
CREATE INDEX idx_cat_template ON audit_categories(template_id, level);
```

#### `audit_items`
Item audit di level terdalam (leaf node). Item inilah yang dinilai dan dilampiri evidence.

```sql
CREATE TABLE audit_items (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id  BIGINT NOT NULL REFERENCES audit_categories(id),
    code         VARCHAR(50),
    name         TEXT NOT NULL,
    description  TEXT,
    sort_order   INT DEFAULT 0,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Tabel Pelaksanaan Audit

#### `audits`
Header pelaksanaan audit per sesi.

```sql
CREATE TABLE audits (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    dealer_id    BIGINT NOT NULL REFERENCES dealers(id),
    template_id  BIGINT NOT NULL REFERENCES audit_templates(id),
    title        VARCHAR(255) NOT NULL,
    audit_date   DATE NOT NULL,
    location     VARCHAR(255),
    status       ENUM('draft','ongoing','completed','archived') DEFAULT 'draft',
    auditor_id   BIGINT NOT NULL REFERENCES users(id),
    reviewer_id  BIGINT REFERENCES users(id),
    notes        TEXT,
    started_at   TIMESTAMP,
    completed_at TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

#### `audit_links`
Akses link sementara untuk eksekutor lapangan agar dapat masuk menggunakan PIN tanpa perlu akun login permanen.

```sql
CREATE TABLE audit_links (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    audit_id     BIGINT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    uuid         VARCHAR(36) UNIQUE NOT NULL,
    pin          VARCHAR(6) NOT NULL,
    status       ENUM('active', 'used', 'expired') DEFAULT 'active',
    expired_at   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

#### `audit_item_results`
Hasil penilaian per item dalam sebuah sesi audit.

```sql
CREATE TABLE audit_item_results (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    audit_id     BIGINT NOT NULL REFERENCES audits(id),
    item_id      BIGINT NOT NULL REFERENCES audit_items(id),
    status       ENUM('pass','fail','na','pending') DEFAULT 'pending',
    notes        TEXT,
    reviewed_by  BIGINT REFERENCES users(id),
    reviewed_at  TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
    UNIQUE (audit_id, item_id)
);
```

#### `audit_evidences`
File evidence yang dilampirkan pada setiap hasil item.

```sql
CREATE TABLE audit_evidences (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    result_id     BIGINT NOT NULL REFERENCES audit_item_results(id),
    file_url      VARCHAR(500) NOT NULL,
    file_type     VARCHAR(50),           -- image/jpeg, application/pdf, dst
    original_name VARCHAR(255),
    file_size     BIGINT,                -- bytes
    caption       TEXT,
    uploaded_by   BIGINT NOT NULL REFERENCES users(id),
    uploaded_at   TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Diagram Relasi

```
audit_templates
    │
    ├──► audit_level_configs   (label per level, dinamis)
    │
    ├──► audit_categories      (hierarki dinamis, self-referencing)
    │         │
    │         └──► audit_items (leaf node, yang diaudit)
    │
    └──► audits                (sesi pelaksanaan audit)
              │
              └──► audit_item_results   (hasil per item)
                        │
                        └──► audit_evidences  (file bukti)
```

---

## 5. Backend Requirements

### 5.1 Tech Stack (Rekomendasi)

| Komponen | Pilihan |
|----------|---------|
| Runtime | Node.js (v20+) atau Go |
| Framework | Express.js / Fastify / Hono |
| ORM | Prisma (Node) atau GORM (Go) |
| Database | PostgreSQL 15+ |
| File Storage | AWS S3 / MinIO / Google Cloud Storage |
| Auth | JWT + Refresh Token |
| Cache | Redis |
| Queue | BullMQ (Node) untuk proses async upload |

### 5.2 Modul & API Endpoints

#### Auth Module

```
POST   /api/auth/login              Login user
POST   /api/auth/logout             Logout & invalidate token
POST   /api/auth/refresh            Refresh access token
GET    /api/auth/me                 Info user yang sedang login
```

#### Template Module

```
GET    /api/templates               List semua template (paginated)
POST   /api/templates               Buat template baru
GET    /api/templates/:id           Detail template
PUT    /api/templates/:id           Update template
DELETE /api/templates/:id           Hapus template (soft delete)

GET    /api/templates/:id/levels    Ambil konfigurasi level
PUT    /api/templates/:id/levels    Update konfigurasi level (bulk)
```

#### Category Module

```
GET    /api/templates/:id/categories          Ambil pohon kategori lengkap
POST   /api/templates/:id/categories          Buat kategori baru
PUT    /api/categories/:id                    Update kategori
DELETE /api/categories/:id                    Hapus kategori
PATCH  /api/categories/:id/sort               Update urutan
```

Respons pohon kategori (rekursif):

```json
{
  "data": [
    {
      "id": 1,
      "level": 0,
      "level_label": "Parameter",
      "name": "Keselamatan Kerja",
      "children": [
        {
          "id": 3,
          "level": 1,
          "level_label": "Sub Parameter",
          "name": "Alat Pelindung Diri",
          "children": [
            {
              "id": 7,
              "level": 2,
              "level_label": "Group",
              "name": "Pelindung Kepala",
              "children": [],
              "items": [
                { "id": 12, "code": "APD-001", "name": "Helm Safety" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

#### Item Module

```
GET    /api/categories/:id/items    List item dalam kategori
POST   /api/categories/:id/items    Buat item baru
PUT    /api/items/:id               Update item
DELETE /api/items/:id               Hapus item
PATCH  /api/items/sort              Update urutan (bulk)
```

#### Audit Module

```
GET    /api/audits                  List audit (filter: status, template, tanggal)
POST   /api/audits                  Buat sesi audit baru
GET    /api/audits/:id              Detail audit + progress summary
PUT    /api/audits/:id              Update header audit
PATCH  /api/audits/:id/status       Update status (start, complete, archive)

GET    /api/audits/:id/results      Ambil semua hasil item dalam audit
GET    /api/audits/:id/tree         Pohon kategori + item + hasil (untuk pengisian)
```

#### Result Module

```
PUT    /api/audits/:id/results/:itemId    Isi/update hasil item
                                          Body: { status, notes }
```

#### Evidence Module

```
POST   /api/results/:id/evidences         Upload evidence (multipart/form-data)
GET    /api/results/:id/evidences         List evidence sebuah result
DELETE /api/evidences/:id                 Hapus evidence
GET    /api/evidences/:id/download        Download file evidence

POST   /api/evidences/presign             Generate presigned URL untuk upload langsung ke storage
```

#### Report Module

```
GET    /api/audits/:id/report             Generate laporan audit (JSON)
GET    /api/audits/:id/report/pdf         Export laporan ke PDF
GET    /api/audits/:id/report/excel       Export laporan ke Excel
```

#### Dashboard Module

```
GET    /api/dashboard/summary             Ringkasan total audit, pass/fail rate
GET    /api/dashboard/recent              Audit terbaru
GET    /api/dashboard/progress/:auditId   Progress real-time sebuah audit
```

### 5.3 Business Logic Penting

#### Kalkulasi Progress Audit

```
progress = (jumlah item dengan status != 'pending') / total_item * 100
pass_rate = (jumlah item 'pass') / (total_item - jumlah 'na') * 100
```

#### Hierarki Kategori — Query Rekursif

Gunakan CTE (Common Table Expression) untuk efisiensi:

```sql
WITH RECURSIVE category_tree AS (
    -- Anchor: root level
    SELECT id, parent_id, level, name, sort_order, 0 AS depth
    FROM audit_categories
    WHERE template_id = $1 AND parent_id IS NULL

    UNION ALL

    -- Recursive: child nodes
    SELECT c.id, c.parent_id, c.level, c.name, c.sort_order, ct.depth + 1
    FROM audit_categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY depth, sort_order;
```

#### Upload Evidence — Alur

```
1. Client meminta presigned URL → POST /api/evidences/presign
2. Server generate presigned URL ke storage (S3/MinIO), return URL + key
3. Client upload file langsung ke storage menggunakan presigned URL
4. Client kirim konfirmasi ke server → POST /api/results/:id/evidences { key, caption }
5. Server simpan metadata ke tabel audit_evidences
```

Pendekatan ini mengurangi beban server dan mendukung file besar.

#### Validasi Status Audit

- Status hanya bisa maju: `draft` → `ongoing` → `completed` → `archived`
- Audit tidak bisa `completed` jika masih ada item berstatus `pending` (konfigurasi opsional)
- Hanya auditor yang ditugaskan yang bisa mengisi hasil

### 5.4 Keamanan

- Semua endpoint dilindungi JWT (kecuali `/auth/login`)
- Role-based access control (RBAC) pada setiap endpoint
- File evidence hanya bisa diakses oleh user yang berwenang (presigned URL dengan expiry)
- Validasi tipe file upload: whitelist `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Maksimum ukuran file per evidence: 10 MB (konfigurasi)
- Rate limiting pada endpoint upload

### 5.5 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item audit tidak ditemukan",
    "details": {}
  }
}
```

### 5.6 Pagination & Filter

Semua endpoint list menggunakan format:

```json
{
  "data": [...],
  "meta": {
    "total": 120,
    "page": 1,
    "per_page": 20,
    "total_pages": 6
  }
}
```

---

## 6. Frontend Requirements

### 6.1 Tech Stack (Rekomendasi)

| Komponen | Pilihan |
|----------|---------|
| Framework | Next.js 14+ (App Router) atau React + Vite |
| State Management | Zustand + React Query (TanStack Query) |
| UI Components | shadcn/ui + Tailwind CSS |
| Form | React Hook Form + Zod |
| File Upload | react-dropzone |
| Charts | Recharts |
| Export | jsPDF + xlsx |
| Mobile Support | Responsive (PWA opsional) |

### 6.2 Halaman & Fitur

#### 6.2.1 Autentikasi

**Halaman Login**
- Form email + password
- Remember me
- Redirect ke dashboard setelah login

#### 6.2.2 Dashboard

**Tampilan Utama**
- Summary card: total audit, sedang berjalan, selesai bulan ini
- Grafik pass/fail rate per bulan
- Tabel audit terbaru dengan status badge
- Quick action: "Mulai Audit Baru"

#### 6.2.3 Manajemen Template

**List Template** (`/templates`)
- Tabel template dengan kolom: nama, jumlah level, jumlah item, status
- Search dan filter
- Tombol buat template baru

**Detail / Edit Template** (`/templates/:id`)
- Tab 1: **Konfigurasi Level** — atur jumlah dan nama level secara dinamis

  ```
  Level 0: [Parameter      ] [hapus]
  Level 1: [Sub Parameter  ] [hapus]
  Level 2: [Group          ] [hapus]
           [+ Tambah Level ]
  ```

- Tab 2: **Struktur Kategori** — tree editor untuk membuat hierarki

  Tree editor mendukung:
  - Tambah node di level manapun
  - Rename inline (double-click)
  - Drag-and-drop untuk reorder
  - Expand/collapse per node
  - Tambah item di bawah node leaf

  Contoh tampilan tree:
  ```
  ▼ Keselamatan Kerja                          [+ Sub] [✏] [🗑]
    ▼ Alat Pelindung Diri                      [+ Sub] [✏] [🗑]
      ▼ Pelindung Kepala                       [+ Item][✏] [🗑]
          ○ APD-001  Helm Safety               [✏] [🗑]
          ○ APD-002  Pelindung Wajah           [✏] [🗑]
      ► Pelindung Tangan
    ► Prosedur Evakuasi
  ```

#### 6.2.4 Pelaksanaan Audit

**List Audit** (`/audits`)
- Filter berdasarkan: status, template, tanggal, auditor
- Badge status berwarna: draft (abu), ongoing (biru), completed (hijau)
- Progress bar per audit

**Buat Audit Baru** (`/audits/new`)
- Pilih template
- Isi judul, tanggal, lokasi, reviewer
- Submit → redirect ke halaman pengisian

**Halaman Pengisian Audit** (`/audits/:id/fill`)

Ini adalah halaman utama dan paling kompleks.

Layout:
```
┌─────────────────────────────────────────────┐
│  [◄ Kembali]  Audit: Inspeksi K3 Q2 2025   │
│  Progress: ████████░░ 78%  [Selesaikan]     │
├────────────────┬────────────────────────────┤
│  Navigasi      │  Detail Item               │
│  (Tree panel)  │  (Panel kanan)             │
│                │                            │
│  ▼ Parameter 1 │  APD-001 Helm Safety       │
│    ▼ Sub Par 1 │  ─────────────────────     │
│      ▼ Group 1 │  Status:                   │
│        ○ Item1 │  ○ Pass  ● Fail  ○ N/A     │
│        ● Item2 │                            │
│      ► Group 2 │  Catatan:                  │
│    ► Sub Par 2 │  [textarea...]             │
│  ► Parameter 2 │                            │
│                │  Evidence (2 file):        │
│                │  [📷 foto1.jpg] [✕]        │
│                │  [📄 laporan.pdf] [✕]      │
│                │  [+ Upload Evidence]       │
│                │                            │
│                │  [◄ Prev Item] [Next ►]    │
└────────────────┴────────────────────────────┘
```

Fitur panel kiri (tree):
- Highlight item yang sedang aktif
- Icon status per item: ✓ (pass, hijau), ✗ (fail, merah), — (na, abu), ○ (pending, kosong)
- Klik item langsung buka di panel kanan
- Badge jumlah evidence per item

Fitur panel kanan (detail item):
- Toggle status dengan satu klik
- Auto-save setiap perubahan (debounce 1 detik)
- Upload evidence dengan drag-and-drop atau klik
  - Preview thumbnail untuk gambar
  - Ikon file untuk PDF/dokumen
  - Caption opsional per file
- Navigasi Prev/Next antar item tanpa reload halaman

**Fitur mobile-friendly:**
- Layout satu kolom di layar kecil
- Tree tersembunyi di balik drawer/bottom sheet
- Kamera langsung bisa digunakan untuk upload evidence

#### 6.2.5 Review & Laporan

**Detail Audit — View Mode** (`/audits/:id`)
- Summary: total item, pass, fail, na, pending
- Progress per kategori level pertama (donut chart atau progress bar)
- Tabel lengkap hasil per item dengan status dan jumlah evidence
- Tombol export: PDF, Excel

**Halaman Laporan PDF** (preview sebelum download)
- Cover: judul audit, tanggal, auditor, reviewer
- Ringkasan eksekutif
- Hasil per kategori dengan tabel item
- Lampiran: daftar evidence (thumbnail + nama file)

### 6.3 Komponen Reusable

| Komponen | Deskripsi |
|----------|-----------|
| `StatusBadge` | Badge berwarna untuk status audit dan item |
| `CategoryTree` | Tree navigasi hierarki dinamis |
| `EvidenceUploader` | Drag-and-drop upload dengan preview |
| `EvidenceGallery` | Tampilan grid evidence dengan lightbox |
| `AuditProgress` | Progress bar dengan breakdown per kategori |
| `ItemResultForm` | Form isian status + catatan per item |
| `LevelConfigEditor` | Editor konfigurasi level dinamis di template |
| `TreeNodeEditor` | Node tree yang bisa di-rename dan reorder |

### 6.4 State Management

```
Store global (Zustand):
├── auth             → user, token, permissions
├── activeAudit      → audit yang sedang diisi
│     ├── header     → info audit
│     ├── tree       → struktur kategori + item
│     ├── results    → map itemId → { status, notes, evidences }
│     └── activeItem → item yang sedang dibuka di panel kanan
└── ui               → sidebar open, loading states
```

Server state (React Query):
- Cache template list, detail template
- Cache audit list, detail audit
- Invalidate setelah mutasi (tambah/edit/hapus)

### 6.5 Offline & Sinkronisasi (Fase 2)

- Simpan hasil pengisian di IndexedDB saat offline
- Sinkronisasi otomatis saat kembali online
- Indicator online/offline di header

---

## 7. Non-Functional Requirements

### 7.1 Performa

| Metrik | Target |
|--------|--------|
| Halaman pertama load (LCP) | < 2.5 detik |
| Response API read | < 300ms (p95) |
| Response API write | < 500ms (p95) |
| Upload evidence 10MB | < 30 detik |
| Render tree 500+ item | < 1 detik |

### 7.2 Keandalan

- Uptime target: 99.5%
- Auto-save mencegah kehilangan data
- Retry otomatis untuk upload yang gagal

### 7.3 Skalabilitas

- Database mendukung hingga 1.000 template, 100.000 item, 1.000.000 evidence
- File storage terpisah dari database (object storage)
- API stateless, siap horizontal scaling

### 7.4 Aksesibilitas

- Mendukung keyboard navigation penuh
- ARIA label pada semua komponen interaktif
- Kontras warna minimal WCAG AA

---

## 8. Roadmap

### Fase 1 — MVP (Bulan 1–3)

- [ ] Auth & manajemen user
- [ ] CRUD template + konfigurasi level dinamis
- [ ] Tree editor kategori & item
- [ ] Pelaksanaan audit + pengisian hasil
- [ ] Upload evidence (gambar & PDF)
- [ ] Dashboard progress audit
- [ ] Export laporan PDF sederhana

### Fase 2 — Enhancement (Bulan 4–6)

- [ ] Notifikasi (email / in-app) untuk assignment dan review
- [ ] Komentar dan anotasi pada evidence
- [ ] Mode offline dengan sinkronisasi
- [ ] Template library (bisa clone antar tim)
- [ ] Bulk assignment item ke auditor berbeda
- [ ] Export Excel dengan format custom

### Fase 3 — Advanced (Bulan 7–12)

- [ ] Scoring & pembobotan per item
- [ ] Audit trail lengkap (log semua perubahan)
- [ ] Integrasi e-signature untuk pengesahan laporan
- [ ] API publik untuk integrasi sistem eksternal
- [ ] Analitik historis dan tren per kategori
- [ ] Mobile app (React Native atau PWA)

---

*Dokumen ini bersifat living document dan akan diperbarui seiring perkembangan produk.*
