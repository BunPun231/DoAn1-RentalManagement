# Backend - Smart Room Rental SaaS

## Prerequisites

- Java 21
- Maven 3.9+
- Neon PostgreSQL-compatible database
- Redis 7+

## Run in local (dev profile)

1. Create environment variables:

	- `DB_URL=jdbc:postgresql://YOUR-NEON-HOST/YOUR_DATABASE?sslmode=require`
	- `DB_USERNAME=YOUR_NEON_USERNAME`
	- `DB_PASSWORD=YOUR_NEON_PASSWORD`
	- `REDIS_HOST=localhost`
	- `REDIS_PORT=6379`

2. Start application:

```bash
./mvnw spring-boot:run
```

## Useful endpoints

- Health: `GET /api/public/health`
- Actuator health: `GET /actuator/health`
- OpenAPI docs: `GET /swagger-ui.html`

## Notes

- Multi-tenant context is resolved via `X-Tenant-Id` header.
- Flyway migrations are in `src/main/resources/db/migration`.
- Neon is used as the managed PostgreSQL layer, so the backend no longer depends on a local PostgreSQL container.

