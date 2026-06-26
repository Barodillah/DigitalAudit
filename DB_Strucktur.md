Saya rekomendasikan **Adjacency List** — simpel, fleksibel, dan cukup powerful untuk kebutuhan audit ini.

Berikut struktur DB lengkapnya beserta ERD visual:---

![ERD](audit_db_erd.html)

### Penjelasan tiap tabel

**`audit_templates`** — master template audit. Satu template bisa dipakai berkali-kali untuk audit berbeda (misalnya "Template K3 2025").

**`audit_level_configs`** — di sinilah label level diatur secara dinamis per template. Contoh:
```
level 0 → "Parameter"
level 1 → "Sub Parameter"
level 2 → "Group"
```
Tinggal tambah/hapus baris di tabel ini untuk mengubah jumlah dan nama level.

**`audit_categories`** — inti dari hierarki dinamis. Kolom `parent_id` menunjuk ke dirinya sendiri (self-referencing), sehingga bisa membentuk pohon sedalam apapun. Kolom `level` membantu navigasi dan rendering tanpa harus rekursi.

**`audit_items`** — leaf node / ujung dari hierarki. Item inilah yang diaudit, nilainya selalu menggantung di bawah `audit_categories`.

**`audits`** — header pelaksanaan audit (kapan, siapa, status: draft/ongoing/completed).

**`audit_item_results`** — hasil penilaian per item: `pass`, `fail`, atau `na`.

**`audit_evidences`** — file upload (foto, PDF, dokumen) yang dilampirkan ke setiap hasil item. Satu result bisa punya banyak evidence.

---

### Contoh query ambil hierarki lengkap

```sql
-- Ambil semua kategori beserta label level-nya (untuk 1 template)
SELECT 
  c.id,
  c.parent_id,
  c.level,
  lc.label AS level_label,
  c.name,
  c.sort_order
FROM audit_categories c
JOIN audit_level_configs lc 
  ON lc.template_id = c.template_id 
  AND lc.level = c.level
WHERE c.template_id = 1
ORDER BY c.level, c.sort_order;
```

```sql
-- Ambil item beserta evidence-nya untuk audit tertentu
SELECT 
  i.code,
  i.name AS item_name,
  r.status,
  r.notes,
  e.file_url,
  e.file_type,
  e.caption
FROM audit_items i
JOIN audit_item_results r ON r.item_id = i.id
LEFT JOIN audit_evidences e ON e.result_id = r.id
WHERE r.audit_id = 42
ORDER BY i.sort_order;
```

---