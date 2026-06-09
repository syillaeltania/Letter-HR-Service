# Letter Template Seed

Seed data membuat 4 kategori dan 4 template aktif berdasarkan contoh dokumen HR:

| Kategori | Code | Numbering Format | Template |
| --- | --- | --- | --- |
| Kontrak Kerja Karyawan | `KK.01` | `NW-{{sequence}}/KK.01/HCM/{{roman_month}}/{{year}}` | Template Kontrak Kerja Karyawan |
| Kontrak Kerja Magang | `KK.02` | `NW-{{sequence}}/KK.02/HCM/{{roman_month}}/{{year}}` | Template Kontrak Kerja Magang |
| Kontrak Kerja Freelancer | `KK.03` | `NW-{{sequence}}/KK.03/HCM/{{roman_month}}/{{year}}` | Template Kontrak Kerja Freelancer |
| Offering Letter | `KK.01-OL` | `NW-{{sequence}}/KK.01-OL/HCM/{{roman_month}}/{{year}}` | Template Offering Letter |

## Cara Menjalankan

```bash
cd letter-generator-backend
npm run seed
```

Template memakai placeholder seperti:

```text
{{letter_number}}
{{employee_name}}
{{position}}
{{division}}
{{contract_start_date}}
{{contract_end_date}}
{{basic_salary}}
{{total_take_home_pay}}
```

Nomor surat tetap dihasilkan otomatis setelah approval.

## DOCX Styling 1:1

File DOCX asli dari lampiran digunakan sebagai basis template styling dan disimpan di:

```text
templates/docx/
├── kontrak-kerja-karyawan.docx
├── kontrak-kerja-magang.docx
├── kontrak-kerja-freelancer.docx
└── offering-letter.docx
```

Jalankan ulang generator jika file lampiran berubah:

```bash
npm run templates:docx
```

Saat generate DOCX, backend memakai `docxTemplatePath` agar layout, font, tabel, spacing, header/footer, dan styling dari dokumen Word asli tetap dipertahankan.

Backend juga memiliki fallback mapping berdasarkan `category_code`, sehingga template lama yang belum memiliki `docxTemplatePath` tetap memakai DOCX asli:

| Code | File DOCX |
| --- | --- |
| `KK.01` | `templates/docx/kontrak-kerja-karyawan.docx` |
| `KK.02` | `templates/docx/kontrak-kerja-magang.docx` |
| `KK.03` | `templates/docx/kontrak-kerja-freelancer.docx` |
| `KK.01-OL` | `templates/docx/offering-letter.docx` |

Audit styling DOCX:

```bash
npm run templates:audit
```

Audit ini membandingkan page size, margin, section columns, header, footer, dan media/logo file antara lampiran asli dan template yang dipakai backend.
