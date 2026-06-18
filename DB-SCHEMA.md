## 4. Database Schema (DBML)

-- ======================================================
-- SCRIPT TẠO CSDL HỆ THỐNG QUẢN LÝ PHÒNG TRỌ THÔNG MINH
-- DBMS: PostgreSQL 14+
-- ======================================================

-- Bật extension UUID nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------
-- 1. tenants
-- ------------------------------------------------------
CREATE TABLE tenants (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    owner_user_id  UUID NOT NULL,                -- FK users(id)
    status         VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL')),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP
);
COMMENT ON TABLE tenants IS 'Không gian làm việc của mỗi chủ nhà (SaaS tenant)';
COMMENT ON COLUMN tenants.owner_user_id IS 'User (role=MANAGER) sở hữu tenant này';

-- ------------------------------------------------------
-- 2. subscription_plans
-- ------------------------------------------------------
CREATE TABLE subscription_plans (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL UNIQUE,
    price_per_month   DECIMAL(12,2) NOT NULL,
    max_motels        INT NOT NULL,
    max_rooms         INT NOT NULL,
    max_technicians   INT NOT NULL DEFAULT 0,
    storage_quota_mb  INT NOT NULL,
    allowed_modules   JSONB,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE subscription_plans IS 'Các gói dịch vụ SaaS (Cơ bản, Nâng cao, Dùng thử)';

-- ------------------------------------------------------
-- 3. tenant_subscriptions
-- ------------------------------------------------------
CREATE TABLE tenant_subscriptions (
    id          SERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id     INT NOT NULL REFERENCES subscription_plans(id),
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT')),
    auto_renew  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE tenant_subscriptions IS 'Lịch sử đăng ký gói của tenant';

-- ------------------------------------------------------
-- 4. tenant_quotas
-- ------------------------------------------------------
CREATE TABLE tenant_quotas (
    tenant_id                UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    current_motels           INT NOT NULL DEFAULT 0,
    current_rooms            INT NOT NULL DEFAULT 0,
    current_storage_used_mb  INT NOT NULL DEFAULT 0,
    last_updated             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE tenant_quotas IS 'Cache hạn mức sử dụng thực tế của tenant';

-- ------------------------------------------------------
-- 5. users
-- ------------------------------------------------------
CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone                 VARCHAR(15) NOT NULL UNIQUE,
    email                 VARCHAR(255),
    password_hash         VARCHAR(255) NOT NULL,
    full_name             VARCHAR(255) NOT NULL,
    role                  VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'TECHNICIAN', 'TENANT')),
    status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'PENDING', 'INACTIVE')),
    must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url            TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP,
    last_login_at         TIMESTAMP,
    lock_reason           TEXT
);
COMMENT ON TABLE users IS 'Tài khoản đăng nhập cho mọi actor';
COMMENT ON COLUMN users.tenant_id IS 'NULL đối với Admin, ngược lại xác định tenant của user';

-- ------------------------------------------------------
-- 6. tenant_profiles
-- ------------------------------------------------------
CREATE TABLE tenant_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    id_card_number      VARCHAR(20) NOT NULL UNIQUE,
    id_card_front_url   TEXT,
    id_card_back_url    TEXT,
    verified_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);
COMMENT ON TABLE tenant_profiles IS 'Hồ sơ định danh mở rộng cho Khách thuê (TENANT)';

-- ------------------------------------------------------
-- 7. technician_profiles
-- ------------------------------------------------------
CREATE TABLE technician_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    expertise           TEXT[],
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_motel_ids  INTEGER[],
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);
COMMENT ON TABLE technician_profiles IS 'Hồ sơ mở rộng cho Kỹ thuật viên';

-- ------------------------------------------------------
-- 8. profile_change_requests
-- ------------------------------------------------------
CREATE TABLE profile_change_requests (
    id               SERIAL PRIMARY KEY,
    tenant_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_full_name    VARCHAR(255),
    new_id_card      VARCHAR(20),
    proof_image_url  TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by      UUID REFERENCES users(id),
    rejection_reason TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP
);
COMMENT ON TABLE profile_change_requests IS 'Yêu cầu sửa hồ sơ định danh của khách thuê (UC07)';

-- ------------------------------------------------------
-- 9. motels
-- ------------------------------------------------------
CREATE TABLE motels (
    id           SERIAL PRIMARY KEY,
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    address      TEXT NOT NULL,
    total_floors INT NOT NULL,
    description  TEXT,
    is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP,
    CONSTRAINT motels_tenant_name_unique UNIQUE (tenant_id, name)
);
COMMENT ON TABLE motels IS 'Khu trọ / Tòa nhà cho thuê';

-- ------------------------------------------------------
-- 10. rooms
-- ------------------------------------------------------
CREATE TABLE rooms (
    id                     SERIAL PRIMARY KEY,
    motel_id               INT NOT NULL REFERENCES motels(id) ON DELETE CASCADE,
    room_number            VARCHAR(20) NOT NULL,
    floor                  INT NOT NULL,
    area                   DECIMAL(10,2),
    base_price             DECIMAL(12,2) NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'EMPTY' CHECK (status IN ('EMPTY', 'DEPOSITED', 'RENTED', 'REPAIRING', 'OUT_OF_BUSINESS')),
    current_tenants_count  INT NOT NULL DEFAULT 0,
    is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
    description            TEXT,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP,
    CONSTRAINT rooms_motel_room_unique UNIQUE (motel_id, room_number)
);
COMMENT ON TABLE rooms IS 'Phòng trọ thuộc một khu trọ';

-- ------------------------------------------------------
-- 11. services
-- ------------------------------------------------------
CREATE TABLE services (
    id           SERIAL PRIMARY KEY,
    motel_id     INT NOT NULL REFERENCES motels(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    charge_type  VARCHAR(20) NOT NULL CHECK (charge_type IN ('FIXED', 'PER_PERSON', 'PER_INDEX', 'PER_QUANTITY')),
    unit         VARCHAR(20),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP,
    CONSTRAINT services_motel_name_unique UNIQUE (motel_id, name)
);
COMMENT ON TABLE services IS 'Danh mục dịch vụ của một khu trọ';

-- ------------------------------------------------------
-- 12. service_pricing
-- ------------------------------------------------------
CREATE TABLE service_pricing (
    id             SERIAL PRIMARY KEY,
    service_id     INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    base_price     DECIMAL(12,2),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE service_pricing IS 'Lịch sử giá của dịch vụ (áp dụng cho FIXED, PER_PERSON, PER_QUANTITY)';

-- ------------------------------------------------------
-- 13. service_tier_pricing
-- ------------------------------------------------------
CREATE TABLE service_tier_pricing (
    id             SERIAL PRIMARY KEY,
    pricing_id     INT NOT NULL REFERENCES service_pricing(id) ON DELETE CASCADE,
    tier_start     DECIMAL(12,2) NOT NULL,
    tier_end       DECIMAL(12,2),
    price_per_unit DECIMAL(12,2) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tier_range CHECK (tier_end IS NULL OR tier_start <= tier_end)
);
COMMENT ON TABLE service_tier_pricing IS 'Bảng giá bậc thang cho dịch vụ PER_INDEX';

-- ------------------------------------------------------
-- 14. service_usages
-- ------------------------------------------------------
CREATE TABLE service_usages (
    id                  SERIAL PRIMARY KEY,
    room_id             INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    service_id          INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    registered_quantity INT NOT NULL DEFAULT 1,
    start_index         DECIMAL(12,2),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_CANCELLATION')),
    registered_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);
COMMENT ON TABLE service_usages IS 'Gán dịch vụ vào phòng, lưu trạng thái và chỉ số đầu kỳ';

-- ------------------------------------------------------
-- 15. devices
-- ------------------------------------------------------
CREATE TABLE devices (
    id             SERIAL PRIMARY KEY,
    motel_id       INT NOT NULL REFERENCES motels(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    brand          VARCHAR(100),
    purchase_price DECIMAL(12,2),
    purchase_date  DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'IN_USE', 'BROKEN', 'REPAIRING')),
    is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP
);
COMMENT ON TABLE devices IS 'Kho thiết bị của một khu trọ';

-- ------------------------------------------------------
-- 16. device_usages
-- ------------------------------------------------------
CREATE TABLE device_usages (
    id                 SERIAL PRIMARY KEY,
    device_id          INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    room_id            INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    assigned_quantity  INT NOT NULL DEFAULT 1,
    condition          VARCHAR(20) NOT NULL CHECK (condition IN ('NEW', 'GOOD', 'BROKEN')),
    assigned_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP
);
COMMENT ON TABLE device_usages IS 'Gán thiết bị vào phòng';

-- ------------------------------------------------------
-- 17. device_movement_logs
-- ------------------------------------------------------
CREATE TABLE device_movement_logs (
    id           SERIAL PRIMARY KEY,
    device_id    INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    from_room_id INT REFERENCES rooms(id),
    to_room_id   INT REFERENCES rooms(id),
    action       VARCHAR(20) NOT NULL CHECK (action IN ('ASSIGN', 'RECALL')),
    changed_by   UUID NOT NULL REFERENCES users(id),
    timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note         TEXT
);
COMMENT ON TABLE device_movement_logs IS 'Nhật ký luân chuyển thiết bị giữa kho và phòng';

-- ------------------------------------------------------
-- 18. contracts
-- ------------------------------------------------------
CREATE TABLE contracts (
    id                      SERIAL PRIMARY KEY,
    room_id                 INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    primary_tenant_user_id  UUID NOT NULL REFERENCES users(id),
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    deposit_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    deposit_status          VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (deposit_status IN ('UNPAID', 'PAID', 'REFUNDED', 'DEDUCTED')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'LIQUIDATED', 'CANCELED')),
    intended_move_out_date  DATE,
    pdf_url                 TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP,
    created_by              UUID NOT NULL REFERENCES users(id)
);
COMMENT ON TABLE contracts IS 'Hợp đồng thuê phòng';

-- ------------------------------------------------------
-- 19. contract_tenants
-- ------------------------------------------------------
CREATE TABLE contract_tenants (
    contract_id     INT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    tenant_user_id  UUID NOT NULL REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at         TIMESTAMP,
    PRIMARY KEY (contract_id, tenant_user_id)
);
COMMENT ON TABLE contract_tenants IS 'Danh sách người ở cùng (dùng để tính phí theo đầu người)';

-- ------------------------------------------------------
-- 20. contract_appendixes
-- ------------------------------------------------------
CREATE TABLE contract_appendixes (
    id                SERIAL PRIMARY KEY,
    contract_id       INT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    effective_date    DATE NOT NULL,
    new_base_price    DECIMAL(12,2),
    new_service_prices JSONB,
    reason            TEXT NOT NULL,
    pdf_url           TEXT,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE contract_appendixes IS 'Phụ lục điều chỉnh giá/thời hạn hợp đồng';

-- ------------------------------------------------------
-- 21. meter_readings
-- ------------------------------------------------------
CREATE TABLE meter_readings (
    id                 SERIAL PRIMARY KEY,
    service_usage_id   INT NOT NULL REFERENCES service_usages(id) ON DELETE CASCADE,
    billing_month      DATE NOT NULL,
    old_reading        DECIMAL(12,2) NOT NULL,
    new_reading        DECIMAL(12,2) NOT NULL,
    consumption        DECIMAL(12,2) GENERATED ALWAYS AS (new_reading - old_reading) STORED,
    reading_image_url  TEXT,
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    submitted_by       UUID NOT NULL REFERENCES users(id),
    approved_by        UUID REFERENCES users(id),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP,
    CONSTRAINT check_new_ge_old CHECK (new_reading >= old_reading)
);
COMMENT ON TABLE meter_readings IS 'Chỉ số điện/nước theo kỳ cho mỗi service_usage';

-- ------------------------------------------------------
-- 22. invoices
-- ------------------------------------------------------
CREATE TABLE invoices (
    id            SERIAL PRIMARY KEY,
    contract_id   INT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL,
    total_amount  DECIMAL(12,2) NOT NULL,
    paid_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'VOID')),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP,
    due_date      DATE NOT NULL
);
COMMENT ON TABLE invoices IS 'Hóa đơn tổng hợp theo tháng cho mỗi hợp đồng';

-- ------------------------------------------------------
-- 23. invoice_details
-- ------------------------------------------------------
CREATE TABLE invoice_details (
    id          SERIAL PRIMARY KEY,
    invoice_id  INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity    DECIMAL(12,2) NOT NULL,
    unit_price  DECIMAL(12,2) NOT NULL,
    line_total  DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    service_id  INT REFERENCES services(id)
);
COMMENT ON TABLE invoice_details IS 'Chi tiết từng dòng trong hóa đơn (snapshot giá)';

-- ------------------------------------------------------
-- 24. transactions
-- ------------------------------------------------------
CREATE TABLE transactions (
    id                SERIAL PRIMARY KEY,
    invoice_id        INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount            DECIMAL(12,2) NOT NULL,
    transaction_ref   VARCHAR(100) UNIQUE,
    payment_method    VARCHAR(20) NOT NULL CHECK (payment_method IN ('VIETQR', 'CASH', 'BANK_TRANSFER')),
    bank_code         VARCHAR(20),
    status            VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING_RECONCILE')),
    paid_at           TIMESTAMP,
    raw_webhook_data  JSONB,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE transactions IS 'Lịch sử giao dịch thanh toán';

-- ------------------------------------------------------
-- 25. tenant_balances
-- ------------------------------------------------------
CREATE TABLE tenant_balances (
    tenant_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance        DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE tenant_balances IS 'Số dư tài khoản của khách thuê';

-- ------------------------------------------------------
-- 26. maintenance_tickets
-- ------------------------------------------------------
CREATE TABLE maintenance_tickets (
    id            SERIAL PRIMARY KEY,
    room_id       INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reported_by   UUID NOT NULL REFERENCES users(id),
    assigned_to   UUID REFERENCES users(id),
    category      VARCHAR(50) NOT NULL,
    description   TEXT NOT NULL,
    before_images TEXT[],
    status        VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PROCESSING', 'COMPLETED')),
    priority      VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP,
    completed_at  TIMESTAMP
);
COMMENT ON TABLE maintenance_tickets IS 'Phiếu yêu cầu sửa chữa';

-- ------------------------------------------------------
-- 27. maintenance_details
-- ------------------------------------------------------
CREATE TABLE maintenance_details (
    id                  SERIAL PRIMARY KEY,
    ticket_id           INT NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    device_id           INT NOT NULL REFERENCES devices(id),
    quantity_used       INT NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    after_images        TEXT[],
    note                TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE maintenance_details IS 'Vật tư / linh kiện đã sử dụng trong sửa chữa';

-- ------------------------------------------------------
-- 28. notifications
-- ------------------------------------------------------
CREATE TABLE notifications (
    id                BIGSERIAL PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    content           TEXT NOT NULL,
    type              VARCHAR(30) NOT NULL CHECK (type IN ('SYSTEM', 'REMINDER', 'MAINTENANCE', 'CONTRACT', 'BILLING')),
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    action_url        TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at           TIMESTAMP
);
COMMENT ON TABLE notifications IS 'Thông báo đẩy đến người dùng';

-- ------------------------------------------------------
-- 29. audit_logs
-- ------------------------------------------------------
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id   VARCHAR(255),
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    user_agent  TEXT,
    timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE audit_logs IS 'Nhật ký toàn hệ thống (chỉ Admin xem)';

-- ------------------------------------------------------
-- 30. activity_logs
-- ------------------------------------------------------
CREATE TABLE activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id   VARCHAR(255),
    summary     TEXT NOT NULL,
    timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE activity_logs IS 'Nhật ký hoạt động trong phạm vi một Tenant';

-- ------------------------------------------------------
-- 31. system_configs
-- ------------------------------------------------------
CREATE TABLE system_configs (
    key           VARCHAR(100) PRIMARY KEY,
    value         TEXT NOT NULL,
    is_encrypted  BOOLEAN NOT NULL DEFAULT FALSE,
    description   TEXT,
    updated_at    TIMESTAMP,
    updated_by    UUID REFERENCES users(id)
);
COMMENT ON TABLE system_configs IS 'Cấu hình toàn cục (SMTP, VietQR API, Firebase)';

-- ------------------------------------------------------
-- 32. workspace_configs
-- ------------------------------------------------------
CREATE TABLE workspace_configs (
    tenant_id   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    config      JSONB NOT NULL,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  UUID REFERENCES users(id)
);
COMMENT ON TABLE workspace_configs IS 'Cấu hình riêng của từng Tenant (bật/tắt module)';

-- ======================================================
-- TẠO INDEX ĐỀ XUẤT
-- ======================================================

-- users
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_phone ON users(phone);

-- rooms
CREATE INDEX idx_rooms_motel_id ON rooms(motel_id);
CREATE INDEX idx_rooms_status ON rooms(status);

-- contracts
CREATE INDEX idx_contracts_room_id ON contracts(room_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- invoices
CREATE INDEX idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);

-- meter_readings
CREATE INDEX idx_meter_readings_service_usage_id ON meter_readings(service_usage_id);
CREATE INDEX idx_meter_readings_billing_month ON meter_readings(billing_month);

-- maintenance_tickets
CREATE INDEX idx_tickets_assigned_to ON maintenance_tickets(assigned_to);
CREATE INDEX idx_tickets_status ON maintenance_tickets(status);

-- notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);