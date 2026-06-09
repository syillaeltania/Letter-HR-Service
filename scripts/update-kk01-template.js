const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GLOBAL_NUMBERING_PLACEHOLDERS = [
  'letter_sequence',
  'letter_number',
  'letter_category_code',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
];

const kk01Placeholders = [
  'letter_number',
  'letter_sequence',
  'letter_type_code',
  'letter_category_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
  'sequence_number',
  'letter_day',
  'letter_date_text',
  'letter_year_text',
  'contract_start_date',
  'contract_end_date',
  'employee_name',
  'employee_ktp',
  'employee_birth_place',
  'employee_birth_date',
  'employee_address',
  'position',
  'employment_status',
  'basic_salary',
  'transport_allowance',
  'health_allowance',
  'position_allowance',
  'communication_allowance',
  'operational_allowance',
  'meal_allowance',
  'salary_percentage',
  'pasal_8_point_b_enabled',
  'pasal_8_point_b_text',
  'overtime_workday_rate',
  'overtime_holiday_rate',
];

const kk01TemplateContent = [
  'KONTRAK KERJA',
  '',
  'Data Surat',
  'Hari surat: {{letter_day}}',
  'Tanggal surat: {{letter_date_text}} tahun {{letter_year_text}}',
  'Periode kontrak: {{contract_start_date}} s/d {{contract_end_date}}',
  '',
  'Data Karyawan',
  'Nama: {{employee_name}}',
  'No. KTP: {{employee_ktp}}',
  'Tempat lahir: {{employee_birth_place}}',
  'Tanggal lahir: {{employee_birth_date}}',
  'Alamat: {{employee_address}}',
  '',
  'Data Jabatan',
  'Jabatan: {{position}}',
  'Status: {{employment_status}}',
  '',
  'Data Penghasilan',
  'Gaji pokok: {{basic_salary}}',
  'Tunjangan transportasi: {{transport_allowance}}',
  'Tunjangan kesehatan: {{health_allowance}}',
  'Tunjangan jabatan: {{position_allowance}}',
  'Tunjangan komunikasi: {{communication_allowance}}',
  'Tunjangan operasional: {{operational_allowance}}',
  'Uang makan: {{meal_allowance}}',
  'Persentase gaji: {{salary_percentage}}',
  'Poin b Pasal 8: {{pasal_8_point_b_enabled}}',
  'Isi poin b Pasal 8: {{pasal_8_point_b_text}}',
  'Lembur hari kerja: {{overtime_workday_rate}}',
  'Lembur hari libur: {{overtime_holiday_rate}}',
].join('\n');

async function main() {
  const category = await prisma.letterCategory.findUniqueOrThrow({ where: { categoryCode: 'KK' } });
  const letterType = await prisma.letterType.findFirstOrThrow({
    where: { categoryId: category.id, typeCode: 'KK.01', isActive: true },
  });

  const template = await prisma.letterTemplate.findFirst({
    where: {
      categoryId: category.id,
      templateName: 'Template Kontrak Kerja Karyawan',
    },
    orderBy: { version: 'asc' },
  });
  if (!template) throw new Error('Template Kontrak Kerja Karyawan not found in KK category.');

  const updated = await prisma.letterTemplate.update({
    where: { id: template.id },
    data: {
      letterTypeId: letterType.id,
      templateContent: kk01TemplateContent,
      docxTemplatePath: 'templates/docx/kontrak-kerja-karyawan.docx',
      placeholders: [...new Set([...GLOBAL_NUMBERING_PLACEHOLDERS, ...kk01Placeholders])],
      status: 'ACTIVE',
    },
  });

  console.log(`Updated ${updated.templateName} (${letterType.typeCode}) with ${kk01Placeholders.length} editable variables.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
