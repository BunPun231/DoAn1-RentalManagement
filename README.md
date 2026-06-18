# Smart Room Rental SaaS

Monorepo scaffold for Smart Boarding House Management System.

## Stack

- Backend: Spring Boot 3, PostgreSQL, Flyway, Redis, JWT, OpenAPI
- Frontend: React + Vite + TypeScript + Tailwind + Zustand + TanStack Query + PWA
- Deployment: Docker Compose

## Structure

- `backend/`: Modular monolith backend
- `frontend/`: Web client (PWA-ready)
- `docker/`: Dockerfiles and helper scripts

## Quick Start (Docker)

```bash
docker compose up --build
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

## Quick Start (Local)

Backend:

```bash
cd backend
./mvnw spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
