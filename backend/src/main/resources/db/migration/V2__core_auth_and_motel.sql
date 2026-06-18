ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT 'Unknown';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);

CREATE TABLE IF NOT EXISTS motels (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    total_floors INT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_motels_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT motels_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_motels_tenant_id ON motels(tenant_id);
