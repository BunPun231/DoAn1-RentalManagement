# Smart Room Rental SaaS - Complete Project Specification for AI Coding Agent

**Project Name:** Smart Boarding House Management System (SaaS)  
**SRS Version:** 0.5 (April 21, 2026)  
**ADD Version:** Latest (Attribute-Driven Design)  
**Purpose:** Single source of truth for GitHub Copilot / Cursor / Codex to generate accurate, production-ready code.

## 1. Project Overview

The system is a **multi-tenant SaaS web application** for managing boarding houses (phòng trọ) in Vietnam.  
It targets middle-aged landlords (Managers) with a **minimalist, step-by-step UI**.

**Core Goals:**
- Automate billing (electricity/water tiered pricing + OCR).
- Support VietQR payment with webhook auto-reconciliation.
- Strong multi-tenancy (each landlord has isolated data).
- High usability for non-technical users.

**Four Roles:**
- **ADMIN** – System-wide management
- **MANAGER** – Landlords (main user)
- **TECHNICIAN** – Maintenance staff
- **TENANT** – Renters

## 2. Tech Stack (Final – Aligned with ADD)

| Layer                  | Technology                                      | Reason (ADD Reference)                     |
|------------------------|-------------------------------------------------|--------------------------------------------|
| Frontend               | React + Vite + PWA + Tailwind + shadcn/ui   | QA12, QA14 (Mobile + Offline)              |
| State Management       | Zustand + TanStack Query                        | Offline queue + caching                    |
| Backend                | Spring Boot                    | QA22 (Team familiarity), QA15 (Modularity) |
| Architecture           | Modular Monolith + Clean Architecture           | Decision 1 & 8                             |
| Auth                   | Spring Security + Stateless JWT (custom)        | QA04 (No managed IAM)                      |
| Database               | PostgreSQL 16 + Flyway                          | QA07 (ACID), QA24 (JSONB)                  |
| Caching                | Redis                                       | QA01, QA02 (Performance)                   |
| Media Storage          | Cloudinary                                      | QA25, C5 (20GB limit)                      |
| OCR                    | Google Cloud Vision API + Adapter               | QA10 (Human-in-the-loop)                   |
| Payment                | VietQR Webhook + Adapter Pattern                | QA06                                       |
| Notification           | Resend + Firebase FCM + Outbox Pattern          | QA11                                       |
| Resiliency             | Resilience4j                                    | QA07, QA11                                 |
| Mapping                | MapStruct                                       | Development speed                          |
| Observability          | Actuator + Micrometer + Prometheus/Grafana      | QA16                                       |
| Testing                | JUnit + Testcontainers + Mockito              | QA23 (>80% coverage)                       |
| Deployment             | Docker + Docker Compose                         | QA21, QA26                                 |
| CI/CD                  | GitHub Actions                                  | Build time < 5 min                         |
You can also implement more tech stack as u wish to reduce implement time and effor like these tech: 
Spring Data JPA
Swagger / OpenAPI
MapStruct
Flyway
Lombok
or more, but you have to tell the user prior installing.



## 3. Key Architectural Decisions (from ADD)

- **Modular Monolith + Clean Architecture** (Domain → Application → Infrastructure → Interfaces)
- **Multi-tenancy**: Shared DB + `TenantContext` + global filter (custom-built, no managed IAM)
- **Stateless backend** (JWT + Redis)
- **Append-only versioning** for contracts & financial trail
- **JSONB** for Calculation Snapshots and Tenant Config
- **Adapter Pattern** for all 3rd-party integrations
- **Bounded @Async thread pool** (< 5 threads) for batch jobs
- **Optimistic Locking** (@Version) for concurrency
- **Transactional Outbox** for notifications

**Hard Constraints (ADD):**
- VPS: 2 vCPU / 2GB RAM
- Budget: $0 (only free tiers)
- Timeline: 8 weeks (56 days)
- Team: 2 developers

5. Project Folder Structure
Root
textsmart-room-rental-saas/
├── backend/                  # Spring Boot Modular Monolith
├── frontend/                 # React PWA
├── docker/                   # Docker Compose & production scripts
├── .env.example
├── docker-compose.yml
├── README.md
└── PROJECT-SPEC.md           # This file
└── .gitignore
Backend structure (Clean Architecture):


backend/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── roomrental/
│       │           ├── SmartRoomRentalApplication.java
│       │           │
│       │           ├── common/                  # Cross-cutting concerns
│       │           │   ├── config/              # Redis, Flyway, Resilience4j, MapStruct
│       │           │   ├── exception/           # GlobalExceptionHandler, custom exceptions
│       │           │   ├── security/            # JWT + Multi-tenancy filter (most important)
│       │           │   ├── annotation/          # @TenantAware, @RateLimited...
│       │           │   ├── util/                # TenantContext, JwtUtil, DateUtil...
│       │           │   └── audit/               # AuditListener, AuditLogAspect
│       │           │
│       │           ├── domain/                  # Core business (none dependant to Spring)
│       │           │   ├── shared/              # Value Objects, Events, Enums
│       │           │   ├── tenant/              # Tenant, Subscription, Quota,                                                                      
│       │           │   │                                    WorkspaceConfig
│       │           │   ├── user/                # User, Profile (Manager, Technician, Tenant)
│       │           │   ├── motel/               # Motel, Room, Service
│       │           │   ├── contract/            # Contract, ContractAppendix, ContractVersion
│       │           │   ├── billing/             # Invoice, MeterReading, Transaction, 
│       │           │   │                                   CalculationSnapshot
│       │           │   ├── maintenance/         # MaintenanceTicket, MaintenanceDetail
│       │           │   ├── notification/        # NotificationEvent, Outbox
│       │           │   └── device/              # Device, DeviceUsage, DeviceMovementLog
│       │           │
│       │           ├── application/             # Use Cases / Services
│       │           │   ├── port/                # Outbound ports (interfaces)
│       │           │   ├── service/             # Service implementations
│       │           │   └── usecase/             # (optional) each UC detail
│       │           │
│       │           ├── infrastructure/          # Concrete implementations
│       │           │   ├── persistence/         # JPA Repositories, Entity mappings
│       │           │   ├── adapter/             # OCR Adapter, VietQR Adapter, Email                                                                                                                                                                                                                  
│       │           │   │                                    Adapter, FCM Adapter 
│       │           │   ├── outbox/              # Transactional Outbox Pattern
│       │           │   └── scheduler/           # @Scheduled jobs (invoice generation,
│       │           │                                            notification retry)
│       │           │
│       │           ├── interfaces/              # Web layer
│       │           │   ├── controller/          # REST Controllers (domain-based)
│       │           │   ├── dto/                 # Request/Response DTOs
│       │           │   ├── mapper/              # MapStruct mappers
│       │           │   └── api/                 # OpenAPI spec (if used)
│       │           │
│       │           └── config/                  # ApplicationConfig, SecurityConfig, AsyncConfig...
│       │
│       ├── resources/
│       │   ├── application.yml
│       │   ├── application-dev.yml
│       │   ├── application-prod.yml
│       │   ├── db/
│       │   │   └── migration/                   # Flyway SQL scripts (V1__init.sql...)
│       │   ├── static/                          # (if need serve file)
│       │   └── templates/                       # (if use email template)
│       │
│       └── docker/
│           └── Dockerfile
│
├── build.gradle.kts          # (or pom.xml)
├── gradlew
├── gradlew.bat
└── settings.gradle.kts



Frontend structure:

frontend/
├── src/
│   ├── app/                          # App router + global layout
│   │   ├── layout.tsx
│   │   ├── providers.tsx             # TenantProvider, QueryClientProvider...
│   │   └── globals.css
│   │
│   ├── components/                   # UI components
│   │   ├── ui/                       # shadcn/ui components (button, table, dialog...)
│   │   ├── common/                   # Reusable (DataTable, StepWizard, OfflineIndicator...)
│   │   └── features/                 # Feature-specific (MeterReader, InvoicePreview...)
│   │
│   ├── features/                     # Theo domain (tương tự backend)
│   │   ├── auth/
│   │   ├── tenant/
│   │   ├── motel/
│   │   ├── billing/
│   │   ├── contract/
│   │   ├── maintenance/
│   │   └── notification/
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   ├── useOfflineQueue.ts
│   │   └── useQuery.ts
│   │
│   ├── lib/
│   │   ├── api.ts                    # Axios instance + tenant interceptor
│   │   ├── utils.ts
│   │   ├── validators.ts
│   │   └── offlineStorage.ts         # IndexedDB queue
│   │
│   ├── pages/                        # Page components
│   │   ├── dashboard/
│   │   ├── onboarding/               # Step-by-step wizard
│   │   ├── rooms/
│   │   ├── contracts/
│   │   ├── billing/
│   │   └── maintenance/
│   │
│   ├── store/                        # Zustand stores
│   │   ├── tenantStore.ts
│   │   ├── authStore.ts
│   │   └── offlineQueueStore.ts
│   │
│   ├── service-worker/               # PWA
│   │   └── registerSW.ts
│   │
│   ├── assets/
│   ├── styles/
│   └── types/                        # Global TypeScript types
│
├── public/
│   ├── manifest.json
│   └── icons/
│
├── vite.config.ts
├── tailwind.config.ts
├── components.json                   # shadcn/ui config
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile

DOCKER & DEPLOYMENT:
docker/
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf                        # (optional) reverse proxy
├── entrypoint.sh
└── healthcheck.sh


8. Coding Guidelines for AI Agent

Follow Clean Architecture strictly.
Multi-tenancy: Every query must go through TenantContext.getCurrentTenantId().
Security: All protected endpoints require valid JWT + tenant validation.
Error Handling: Use custom exceptions + message codes (MSG01, MSG98…).
Performance: Use Redis cache for configs & dashboard. Prefer database aggregation over in-memory processing.
OCR: Always store confidence_score, ocr_raw_result, ocr_provider. Implement PENDING if confidence < 90%.
Notifications: Use Transactional Outbox Pattern.
Testing: Write domain service unit tests first (no Spring context).