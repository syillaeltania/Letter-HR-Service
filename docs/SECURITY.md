# Security Best Practices

- Store passwords and refresh tokens as bcrypt hashes only.
- Use short-lived access tokens and rotate refresh tokens on every refresh.
- Enforce RBAC with decorators and guards at controller level.
- Validate all request DTOs with `class-validator` and Nest validation pipes.
- Add rate limiting at the API gateway or load balancer for auth endpoints.
- Keep generated documents in private object storage or a private mounted volume.
- Serve downloads through authenticated API endpoints, never public paths.
- Use TLS, secure cookies when browser-based auth is introduced, and strong JWT secrets.
- Keep audit logs append-only at the application layer.
- Run Prisma migrations through CI/CD with separate database credentials.
