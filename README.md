# InkForge

A small production-shaped blog application: React/Vite, Express, PostgreSQL, JWT authentication, and an nginx-served frontend.

## Quick start (Docker)

1. Copy `.env.example` to `.env` and change the secrets.
2. Run `docker compose up --build`.
3. Open <http://localhost:8080>. The API health check is at <http://localhost:8080/api/health>.

PostgreSQL is initialized with migrations and a demo account:
`demo@example.com` / `demo-password` (change/remove this seed for real deployments).

## Local development

Run PostgreSQL (`docker compose up db`), then:

```sh
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Set `VITE_API_URL=http://localhost:4000/api` for the Vite dev server. Backend checks:
`npm test`; frontend production build: `npm run build`.

## Configuration and security

All configuration is documented in `.env.example` files. Use long random `JWT_SECRET` and
database credentials outside local development. The API uses Helmet, CORS, parameterized
queries, bcrypt password hashing, JWT expiry, request size limits, and basic auth rate limiting.

## API

`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/posts`, `GET /api/posts/:slug`,
`POST|PUT|DELETE /api/posts` (authenticated), `GET|POST|DELETE /api/posts/:id/comments`,
`GET /api/categories`, and `GET /api/health`.
