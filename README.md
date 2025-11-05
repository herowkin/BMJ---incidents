# BMJ Incidents – Backend (Express + MongoDB)

Quick start:
```bash
npm install
cp .env.example .env  # edit values
npm run dev           # or: npm start
```

Seed an admin user (email: admin@bmj.local / password: Admin@123):
```bash
npm run seed
```

Base URL: `http://localhost:${PORT}/api`

## Auth
- `POST /api/auth/register` { name, email, password }
- `POST /api/auth/login` { email, password }
- `GET /api/auth/me` (Bearer token)

## Incidents
- `GET /api/incidents` (query: page, limit, status, priority, q)
- `GET /api/incidents/:id`
- `POST /api/incidents` { title, description, category, priority }
- `PATCH /api/incidents/:id` (e.g., { status, priority, assignedTo })
- `DELETE /api/incidents/:id` (admin or creator)

## Roles
- user, admin

## Notes
- Uses JWT auth. Send header: `Authorization: Bearer <token>`
- MVC structure with controllers, routes, models.
- Error handling middleware standardizes JSON errors.
