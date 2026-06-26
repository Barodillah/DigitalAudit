-- Tabel Dealers (Diler cabang/outlet)
CREATE TABLE dealers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Users (Asumsi dasar untuk RBAC dan referensi Auditor/Reviewer/Admin)
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    dealer_id BIGINT REFERENCES dealers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'staff', 'reviewer', 'viewer') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session tokens untuk login
CREATE TABLE sessions (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master template audit
CREATE TABLE audit_templates (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_by   BIGINT REFERENCES users(id),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Mendefinisikan nama/label setiap level hierarki per template
CREATE TABLE audit_level_configs (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    template_id  BIGINT NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
    level        INT NOT NULL,           -- 0, 1, 2, 3, dst
    label        VARCHAR(100) NOT NULL,  -- "Parameter", "Sub Parameter", "Group", dst
    is_required  BOOLEAN DEFAULT TRUE,
    sort_order   INT DEFAULT 0,
    UNIQUE (template_id, level)
);

-- Hierarki kategori audit (Self-referencing)
CREATE TABLE audit_categories (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    template_id  BIGINT NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
    parent_id    BIGINT NULL REFERENCES audit_categories(id) ON DELETE SET NULL,
    level        INT NOT NULL,
    name         VARCHAR(255) NOT NULL,
    sort_order   INT DEFAULT 0,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cat_parent ON audit_categories(parent_id);
CREATE INDEX idx_cat_template ON audit_categories(template_id, level);

-- Item audit di level terdalam (leaf node)
CREATE TABLE audit_items (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id  BIGINT NOT NULL REFERENCES audit_categories(id) ON DELETE CASCADE,
    code         VARCHAR(50),
    name         TEXT NOT NULL,
    description  TEXT,
    sort_order   INT DEFAULT 0,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Header pelaksanaan audit per sesi
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
    started_at   TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Akses link sementara untuk eksekutor lapangan (menggunakan PIN)
CREATE TABLE audit_links (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    audit_id     BIGINT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    uuid         VARCHAR(36) UNIQUE NOT NULL,
    pin          VARCHAR(6) NOT NULL,
    status       ENUM('active', 'used', 'expired') DEFAULT 'active',
    expired_at   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hasil penilaian per item dalam sebuah sesi audit
CREATE TABLE audit_item_results (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    audit_id     BIGINT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    item_id      BIGINT NOT NULL REFERENCES audit_items(id) ON DELETE CASCADE,
    status       ENUM('pass','fail','na','pending') DEFAULT 'pending',
    notes        TEXT,
    reviewed_by  BIGINT REFERENCES users(id),
    reviewed_at  TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (audit_id, item_id)
);

-- File evidence yang dilampirkan pada setiap hasil item
CREATE TABLE audit_evidences (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    result_id     BIGINT NOT NULL REFERENCES audit_item_results(id) ON DELETE CASCADE,
    file_url      VARCHAR(500) NOT NULL,
    file_type     VARCHAR(50),           -- image/jpeg, application/pdf, dst
    original_name VARCHAR(255),
    file_size     BIGINT,                -- bytes
    caption       TEXT,
    uploaded_by   BIGINT NOT NULL REFERENCES users(id),
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
