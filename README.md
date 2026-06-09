# HR Letter Management API

Production-oriented NestJS backend for HR letter templates, automatic numbering, approval workflows, DOCX/PDF generation, archives, and audit logs.

## Stack

- NestJS, PostgreSQL, Prisma ORM
- JWT access and refresh tokens
- RBAC for `ADMIN_HR`, `STAFF_HR`, `APPROVER`, `VIEWER`
- Swagger, class-validator, Multer-ready platform, Docxtemplater, Puppeteer PDF support
- Docker and Docker Compose

## Folder Structure

```text
src
  common          decorators, guards, enums, request user type
  config          app and jwt config factories
  database        Prisma module/service
  modules
    auth          login, refresh, logout, change password
    users         user CRUD, role assignment, activation
    letter-categories
    letter-templates
    letter-numbering
    letters       draft lifecycle, preview, document generation
    approvals     submit, approve, reject, revision
    archive       search, filters, downloads, history
    audit-logs
prisma            Prisma schema and seed
docs              database schema, ERD, API matrix, migration and security notes
docker            container entrypoint
```

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Swagger is available at `http://localhost:3000/docs`.
API base URL is `http://localhost:3000/api`.

DOCX-to-PDF generation uses LibreOffice headless:

```bash
brew install --cask libreoffice
```

Set `LIBREOFFICE_BIN=soffice` in `.env`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Set `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hr_letters?schema=public` when running inside Compose.

## Letter Numbering

Numbers are generated on approval, not draft creation. The `letter_sequences` table has a unique key on `(category_id, month, year)`, and approval uses a serializable transaction so duplicate numbers are rejected at the database level.

Default format example:

```text
{{sequence}}/HRD/{{category_code}}/{{roman_month}}/{{year}}
001/HRD/SKK/VI/2026
```

## Core Endpoints

All authenticated routes are under `/api`.

- `POST /auth/login`
- `GET /health`
- `POST /auth/refresh`
- `POST /auth/logout`
- `PATCH /auth/change-password`
- `CRUD /users`
- `CRUD /letter-categories`
- `CRUD /letter-templates`
- `POST /letter-templates/:id/versions`
- `POST /letter-templates/:id/upload-docx`
- `CRUD /letters`
- `GET /letters/:id/preview`
- `POST /letters/:id/generate/docx`
- `POST /letters/:id/generate/pdf`
- `POST /approvals/submit/:letterId`
- `POST /approvals/:letterId/approve`
- `POST /approvals/:letterId/reject`
- `POST /approvals/:letterId/revision`
- `GET /archive/letters`
- `GET /archive/letters/:id/history`
- `GET /archive/letters/:id/download/pdf`
- `GET /archive/letters/:id/download/docx`
- `GET /audit-logs`

## Production Notes

- Replace all JWT secrets before deployment.
- Put generated documents in private object storage for multi-node deployments.
- Use CI/CD to run `prisma migrate deploy`.
- Add API gateway rate limiting, especially for auth endpoints.
- Use object-level authorization if approvers/viewers should only see assigned letters.
