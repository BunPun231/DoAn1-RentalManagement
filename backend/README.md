# Backend - Smart Room Rental SaaS

## Prerequisites

- Java 21
- Maven 3.9+
- PostgreSQL 16
- Redis 7+

## Run in local (dev profile)

1. Create environment variables:

	- `DB_URL=jdbc:postgresql://localhost:5432/rental_management`
	- `DB_USERNAME=postgres`
	- `DB_PASSWORD=postgres`
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

