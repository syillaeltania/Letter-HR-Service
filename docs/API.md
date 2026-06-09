# API Endpoints

Base path: `/api`

| Module | Method | Endpoint | Roles |
| --- | --- | --- | --- |
| Health | GET | `/health` | Public |
| Auth | POST | `/auth/login` | Public |
| Auth | POST | `/auth/refresh` | Public |
| Auth | POST | `/auth/logout` | Authenticated |
| Auth | PATCH | `/auth/change-password` | Authenticated |
| Users | GET | `/users` | ADMIN_HR |
| Users | POST | `/users` | ADMIN_HR |
| Users | GET | `/users/:id` | ADMIN_HR |
| Users | PATCH | `/users/:id` | ADMIN_HR |
| Users | PATCH | `/users/:id/status` | ADMIN_HR |
| Users | DELETE | `/users/:id` | ADMIN_HR |
| Categories | CRUD | `/letter-categories` | ADMIN_HR, STAFF_HR |
| Templates | CRUD | `/letter-templates` | ADMIN_HR, STAFF_HR |
| Templates | POST | `/letter-templates/:id/upload-docx` | ADMIN_HR, STAFF_HR |
| Letters | POST | `/letters` | ADMIN_HR, STAFF_HR |
| Letters | GET | `/letters/:id/preview` | ADMIN_HR, STAFF_HR, APPROVER, VIEWER |
| Letters | POST | `/letters/:id/generate/docx` | ADMIN_HR, STAFF_HR |
| Letters | POST | `/letters/:id/generate/pdf` | ADMIN_HR, STAFF_HR |
| Approvals | POST | `/approvals/submit/:letterId` | ADMIN_HR, STAFF_HR |
| Approvals | POST | `/approvals/:letterId/approve` | APPROVER |
| Approvals | POST | `/approvals/:letterId/reject` | APPROVER |
| Approvals | POST | `/approvals/:letterId/revision` | APPROVER |
| Archive | GET | `/archive/letters` | ADMIN_HR, STAFF_HR, VIEWER |
| Archive | GET | `/archive/letters/:id/history` | ADMIN_HR, STAFF_HR, VIEWER |
| Audit Logs | GET | `/audit-logs` | ADMIN_HR |
