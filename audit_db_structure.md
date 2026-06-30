# Struktur Database Audit Digital

Dokumen ini mendeskripsikan struktur tabel dan relasi pada database Audit Digital, diselaraskan penuh dengan **Product Requirements Document (PRD)**. Sistem menggunakan pendekatan **Adjacency List** untuk hierarki dinamis.

## 1. Tabel Utama (Master Data)

### 1.1 `dealers`
Menyimpan data diler/cabang tempat audit akan dilakukan.
- `id` (BIGINT, PK): ID unik diler.
- `code` (VARCHAR): Kode unik diler.
- `name` (VARCHAR): Nama diler.
- `address` (TEXT): Alamat fisik diler.
- `is_active` (BOOLEAN): Status keaktifan.
- `created_at` (TIMESTAMP): Waktu data dibuat.

### 1.2 `users`
Menyimpan data pengguna aplikasi (Auditor, Admin, Reviewer).
- `id` (BIGINT, PK): ID unik pengguna.
- `dealer_id` (BIGINT, FK): Relasi ke tabel `dealers` (opsional untuk user pusat).
- `name` (VARCHAR): Nama lengkap.
- `email` (VARCHAR)
- `password` (VARCHAR)
- `division` (VARCHAR): Divisi/departemen pengguna.
- `role` (ENUM): 'super_admin', 'admin', 'staff', 'reviewer', 'viewer'
- `created_at` (TIMESTAMP)

### 1.3 `audit_templates`
Master template audit yang mendefinisikan jenis dan struktur dasar sebuah audit (misal: "Inspeksi K3" atau "Audit Standar Pelayanan").
- `id` (BIGINT, PK)
- `name` (VARCHAR)
- `description` (TEXT)
- `is_active` (BOOLEAN)
- `created_by` (BIGINT, FK ke `users.id`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 1.4 `audit_level_configs`
Mendefinisikan nama/label setiap level hierarki secara dinamis per template (contoh: Level 0 = "Parameter", Level 1 = "Sub Parameter"). Inilah yang membuat level bersifat dinamis tanpa hardcode.
- `id` (BIGINT, PK)
- `template_id` (BIGINT, FK ke `audit_templates`)
- `level` (INT): 0, 1, 2, dst.
- `label` (VARCHAR): "Parameter", "Group", dll.
- `is_required` (BOOLEAN)
- `sort_order` (INT)

### 1.5 `audit_categories`
Struktur hierarki kategori audit. Menggunakan pendekatan satu tabel (*adjacency list*) untuk semua level dengan merujuk ke tabelnya sendiri (`parent_id`).
- `id` (BIGINT, PK)
- `template_id` (BIGINT, FK ke `audit_templates`)
- `parent_id` (BIGINT, FK ke `audit_categories`): Menjadikannya *sub-category* dari kategori lain.
- `level` (INT)
- `name` (VARCHAR)
- `sort_order` (INT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

### 1.6 `audit_items`
Item audit di level terdalam (*leaf node*). Item inilah yang nantinya dinilai oleh auditor dan dilampiri *evidence*.
- `id` (BIGINT, PK)
- `category_id` (BIGINT, FK ke `audit_categories`)
- `code` (VARCHAR): Kode referensi
- `name` (TEXT): Pertanyaan / Kriteria
- `description` (TEXT)
- `sort_order` (INT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

---

## 2. Tabel Pelaksanaan Audit (Transaksional)

### 2.1 `audits`
Menyimpan sesi pelaksanaan audit.
- `id` (BIGINT, PK): ID unik sesi audit.
- `dealer_id` (BIGINT, FK): Relasi ke tabel `dealers`.
- `template_id` (BIGINT, FK): Relasi ke template.
- `title` (VARCHAR): Nama sesi audit (misal: "Audit Q1 2026").
- `audit_date` (DATE)
- `location` (VARCHAR)
- `status` (ENUM): 'draft', 'ongoing', 'completed', 'archived'
- `auditor_id` (BIGINT, FK ke `users.id`)
- `reviewer_id` (BIGINT, FK)
- `notes` (TEXT)
- `started_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### 2.2 `audit_links`
Akses tautan sementara untuk eksekutor lapangan agar dapat masuk menggunakan PIN tanpa perlu akun login permanen.
- `id` (BIGINT, PK): ID unik link.
- `audit_id` (BIGINT, FK ke `audits`): Sesi audit terkait.
- `uuid` (VARCHAR, 36): Token unik (UUID) untuk parameter URL link.
- `pin` (VARCHAR, 6): PIN keamanan angka 6 digit.
- `status` (ENUM): 'active', 'used', 'expired'.
- `expired_at` (TIMESTAMP): Batas waktu link dapat digunakan.
- `created_at` (TIMESTAMP): Waktu link digenerate.

### 2.3 `audit_item_results`
Hasil penilaian untuk satu item spesifik dalam sebuah sesi audit.
- `id` (BIGINT, PK)
- `audit_id` (BIGINT, FK ke `audits`)
- `item_id` (BIGINT, FK ke `audit_items`)
- `status` (ENUM): 'pass', 'fail', 'na', 'pending'
- `notes` (TEXT)
- `reviewed_by` (BIGINT, FK ke `users.id`)
- `reviewed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 2.3 `audit_evidences`
File *evidence* (gambar/dokumen) yang diunggah untuk mendukung hasil penilaian item.
- `id` (BIGINT, PK)
- `result_id` (BIGINT, FK ke `audit_item_results`)
- `file_url` (VARCHAR): Link menuju S3/Storage
- `file_type` (VARCHAR): MIME type (image/jpeg, application/pdf)
- `original_name` (VARCHAR)
- `file_size` (BIGINT)
- `caption` (TEXT)
- `uploaded_by` (BIGINT, FK ke `users.id`)
- `uploaded_at` (TIMESTAMP)

### 2.4 `audit_item_assignments`
Penugasan satu atau lebih staff ke item audit tertentu.
- `id` (BIGINT, PK)
- `audit_id` (BIGINT, FK ke `audits`)
- `item_id` (BIGINT, FK ke `audit_items`)
- `user_id` (BIGINT, FK ke `users`)
- `assigned_at` (TIMESTAMP)

---

## Diagram Relasi Inti

```text
audit_templates
    │
    ├──► audit_level_configs   (label per level, dinamis)
    │
    ├──► audit_categories      (hierarki dinamis, self-referencing via parent_id)
    │         │
    │         └──► audit_items (leaf node, kriteria yang diaudit)
    │
    └──► audits                (sesi pelaksanaan audit di lapangan)
              │
              └──► audit_item_results   (hasil pengisian per item)
                        │
                        └──► audit_evidences  (file bukti dukung)
```
