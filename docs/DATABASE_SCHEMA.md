# Database Schema

## Tables

| Table | Purpose |
| --- | --- |
| `users` | HR admins, staff, approvers, and viewers |
| `letter_categories` | Letter categories such as `SKK`, `SPD`, `SP` |
| `letter_templates` | Rich text templates, placeholders, versioning, optional DOCX file path |
| `letter_sequences` | Per-category, per-month, per-year running numbers |
| `letters` | Drafts, generated letters, approval state, generated document paths |
| `approvals` | Approval events and reviewer notes |
| `audit_logs` | Append-only business activity history |

## Critical Constraints

- `users.email` is unique.
- `letter_categories.category_code` is unique.
- `letter_templates` has unique `(category_id, template_name, version)`.
- `letter_sequences` has unique `(category_id, month, year)`.
- `letters.letter_number` is unique.

## Status Enums

- User: `ACTIVE`, `INACTIVE`
- Template: `DRAFT`, `ACTIVE`, `ARCHIVED`
- Letter: `DRAFT`, `REVIEW`, `REVISION`, `APPROVED`, `PUBLISHED`, `CANCELLED`
- Approval: `PENDING`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`
