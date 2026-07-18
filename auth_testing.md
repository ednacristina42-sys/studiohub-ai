# Auth Testing — StudioHub AI Client Portal

## Method
JWT Bearer token (HS256, JWT_SECRET in backend/.env). Token stored in localStorage `portal_token`.
Send `Authorization: Bearer <token>` on all /api/portal/* (except /portal/auth/login and /portal/auth/forgot-password).

## Test accounts (seeded)
- ana.rui@email.pt / cliente123
- beatriz.c@email.pt / cliente123

## Flow
1. POST /api/portal/auth/login {email,password} -> {token, client}
2. GET /api/portal/auth/me (Bearer) -> client
3. Portal data endpoints scoped by client_name. password_hash never returned.
4. Wrong password / missing token -> 401.

## Notes
- Passwords hashed with bcrypt. Idempotent seed sets password_hash on the two accounts above.
- forgot-password logs a reset link to backend logs (no email integration yet).
