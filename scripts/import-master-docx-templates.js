const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const sourceDir = process.env.MASTER_DOCX_SOURCE_DIR || '/Users/syilla/Downloads';
const targetDir = path.resolve(__dirname, '..', 'templates', 'docx', 'master');
const GLOBAL_NUMBERING_PLACEHOLDERS = [
  'letter_sequence',
  'letter_number',
  'letter_category_code',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
];

const files = [
  { fileName: 'Master_BAST Resource.docx', typeCode: 'BAST' },
  { fileName: 'Master_SK Demosi_SK.04.docx', typeCode: 'SK.04' },
  { fileName: 'Master_SK Kenaikan Golongan_SK.05.docx', typeCode: 'SK.05' },
  { fileName: 'Master_SK Kenaikan Jabatan (Asesmen Junior Programmer)_SK.02.docx', typeCode: 'SK.02' },
  { fileName: 'Master_SK Kenaikan Jabatan (Asesmen Kebutuhan)_SK.02.docx', typeCode: 'SK.02' },
  { fileName: 'Master_SK Mutasi_SK.03.docx', typeCode: 'SK.03' },
  { fileName: 'Master_SK Peg Tetap_SK.02.docx', typeCode: 'SK.02' },
  { fileName: 'Master_SK Perubahan Penempatan Lokasi Kerja_SK.03.docx', typeCode: 'SK.03' },
  { fileName: 'Master_SK Reposisi_SK.03.docx', typeCode: 'SK.03' },
  { fileName: 'Master_SPB Hasil Evaluasi Kontrak_SPB.06.docx', typeCode: 'SPB.06' },
  { fileName: 'Master_Surat Edaran_SE.docx', typeCode: 'SE' },
  { fileName: 'Master_Surat Keterangan Bekerja (Karyawan)_SKB.01.docx', typeCode: 'SKB.01' },
  { fileName: 'Master_Surat Keterangan Bekerja (Magang)_SKB.02.docx', typeCode: 'SKB.02' },
  { fileName: 'Master_Surat Komitmen (Anggota Baru)_SPK.05.docx', typeCode: 'SPK.05' },
  { fileName: 'Master_Surat Komitmen (Kenaikan Jabatan)_SPK.05.docx', typeCode: 'SPK.05' },
  { fileName: 'Master_Surat Pemberitahuan Lolos dan Undangan HCM dan User_SPB.09.docx', typeCode: 'SPB.09' },
  { fileName: 'Master_Surat Pemberitahuan Lolos dan Undangan Psikotes_SPB.09.docx', typeCode: 'SPB.09' },
  { fileName: 'Master_Surat Pemberitahuan Lolos dan Undangan Skill Test_SPB.09.docx', typeCode: 'SPB.09' },
  { fileName: 'Master_Surat Pemberitahuan Perubahan Approval KPI Anggota_SPB.03.docx', typeCode: 'SPB.03' },
  { fileName: 'Master_Surat Tugas_ST.01.docx', typeCode: 'ST.01' },
];

const COMMON_PLACEHOLDERS = [
  ...GLOBAL_NUMBERING_PLACEHOLDERS,
  'letter_city',
  'subject',
  'recipient_name',
  'recipient_position',
  'recipient_division',
  'recipient_address',
  'employee_name',
  'employee_nik',
  'employee_ktp',
  'employee_birth_place_date',
  'employee_address',
  'position',
  'division',
  'unit_work',
  'signer_name',
  'signer_position',
  'signer_nik',
];

const PLACEHOLDERS_BY_TYPE = {
  BAST: [
    'bast_subject',
    'reference_decree_number',
    'handover_background',
    'handover_day',
    'handover_date_text',
    'handover_location',
    'receiving_team',
    'receiving_leader_name',
    'talent_name',
    'talent_nik',
    'talent_position',
    'talent_authority_notes',
    'receiver_name',
    'receiver_position',
    'submitter_name',
    'submitter_position',
    'handover_items',
    'handover_notes',
  ],
  'SK.02': [
    'decree_title',
    'consideration_items',
    'legal_basis_items',
    'attention_items',
    'decision_effective_date',
    'old_position',
    'new_position',
    'old_grade',
    'new_grade',
    'old_division',
    'new_division',
    'assessment_result',
    'assessment_date',
    'decision_first_point',
    'decision_second_point',
    'decision_third_point',
    'correction_clause',
  ],
  'SK.03': [
    'decree_title',
    'consideration_items',
    'legal_basis_items',
    'attention_items',
    'decision_effective_date',
    'old_position',
    'new_position',
    'old_division',
    'new_division',
    'old_work_location',
    'new_work_location',
    'decision_first_point',
    'decision_second_point',
    'decision_third_point',
    'correction_clause',
  ],
  'SK.04': [
    'decree_title',
    'consideration_items',
    'legal_basis_items',
    'attention_items',
    'decision_effective_date',
    'old_position',
    'new_position',
    'old_division',
    'new_division',
    'demosi_reason',
    'salary_terms',
    'facility_terms',
    'decision_first_point',
    'decision_second_point',
    'decision_third_point',
    'correction_clause',
  ],
  'SK.05': [
    'decree_title',
    'consideration_items',
    'legal_basis_items',
    'attention_items',
    'decision_effective_date',
    'old_grade',
    'new_grade',
    'old_salary',
    'new_salary',
    'decision_first_point',
    'decision_second_point',
    'decision_third_point',
    'correction_clause',
  ],
  'SPB.03': [
    'notification_subject',
    'kpi_period',
    'old_approval_flow',
    'new_approval_flow',
    'effective_date',
    'announcement_content',
    'closing_notes',
  ],
  'SPB.06': [
    'notification_subject',
    'contract_duration',
    'contract_start_date',
    'contract_end_date',
    'evaluation_period',
    'leader_evaluation_summary',
    'performance_score_summary',
    'profiling_summary',
    'legal_basis_items',
    'evaluation_result',
    'recommendation',
    'next_contract_start_date',
    'next_contract_end_date',
    'employee_status_decision',
    'notes',
  ],
  'SPB.09': [
    'candidate_name',
    'position_applied',
    'invitation_stage',
    'test_date',
    'test_time',
    'test_location',
    'meeting_link',
    'pic_name',
    'pic_contact',
    'documents_to_prepare',
    'additional_notes',
  ],
  SE: [
    'announcement_title',
    'announcement_content',
    'effective_date',
    'target_audience',
    'known_by_name',
    'known_by_position',
  ],
  'SKB.01': [
    'employment_start_date',
    'employment_end_date',
    'employment_status',
    'work_location',
    'purpose',
    'certificate_statement',
  ],
  'SKB.02': [
    'internship_start_date',
    'internship_end_date',
    'mentor_name',
    'internship_status',
    'purpose',
    'certificate_statement',
  ],
  'SPK.05': [
    'commitment_title',
    'commitment_date',
    'commitment_points',
    'commitment_period_start',
    'commitment_period_end',
    'sanction_notes',
    'known_by_name',
    'known_by_position',
  ],
  'ST.01': [
    'assignment_title',
    'issuer_name',
    'issuer_nik',
    'issuer_position',
    'issuer_unit',
    'assignee_name',
    'assignee_nik',
    'assignee_position',
    'assignee_unit',
    'assignment_activity',
    'assignment_work_day',
    'assignment_time',
    'assignment_start_date',
    'assignment_end_date',
    'assignment_location',
    'assignment_purpose',
    'assignment_description',
    'transportation',
    'budget_notes',
    'known_by_name',
    'known_by_position',
  ],
};

const FIELD_LABELS = {
  letter_number: 'Nomor surat',
  letter_date: 'Tanggal surat dibuat',
  letter_city: 'Kota surat dibuat',
  subject: 'Perihal',
  recipient_name: 'Nama penerima',
  recipient_position: 'Jabatan penerima',
  recipient_division: 'Divisi penerima',
  recipient_address: 'Alamat penerima',
  employee_name: 'Nama karyawan',
  employee_nik: 'NIK karyawan',
  employee_ktp: 'No. KTP karyawan',
  employee_birth_place_date: 'Tempat/tanggal lahir karyawan',
  employee_address: 'Alamat karyawan',
  position: 'Jabatan',
  division: 'Divisi',
  unit_work: 'Unit kerja',
  signer_name: 'Nama penandatangan',
  signer_position: 'Jabatan penandatangan',
  signer_nik: 'NIK penandatangan',
  consideration_items: 'Menimbang',
  legal_basis_items: 'Mengingat',
  attention_items: 'Memperhatikan',
  known_by_name: 'Nama mengetahui',
  known_by_position: 'Jabatan mengetahui',
};

function slugFileName(fileName) {
  return fileName
    .normalize('NFKD')
    .replace(/[^\w.\-() ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .toLowerCase();
}

function templateNameFromFile(fileName, typeCode) {
  return path
    .basename(fileName, '.docx')
    .replace(/^Master[_\s-]*/i, '')
    .replace(new RegExp(`[_\\s-]*${typeCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlText(zip, fileName) {
  const file = zip.file(fileName);
  return file ? file.asText() : '';
}

function extractPlaceholders(filePath) {
  const zip = new PizZip(fs.readFileSync(filePath));
  const xml = [
    xmlText(zip, 'word/document.xml'),
    ...zip.file(/word\/header\d+\.xml/).map((file) => file.asText()),
    ...zip.file(/word\/footer\d+\.xml/).map((file) => file.asText()),
  ].join('\n');
  const text = xml
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  const placeholders = new Set();
  for (const match of text.matchAll(/\{\{\s*([A-Za-z0-9_.-]+)\s*}}/g)) {
    placeholders.add(match[1]);
  }
  return [...placeholders].sort();
}

function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
}

function templateContent(placeholders, templateName) {
  const localPlaceholders = placeholders.filter((field) => !GLOBAL_NUMBERING_PLACEHOLDERS.includes(field));
  return [
    templateName,
    '',
    'Global Numbering Variables',
    '',
    'Nomor Surat:\n{{letter_number}}',
    'Nomor Urut Surat:\n{{letter_sequence}}',
    'Kode Kategori Surat:\n{{letter_category_code}}',
    'Kode Jenis Surat:\n{{letter_type_code}}',
    'Bulan Romawi Surat:\n{{letter_month_roman}}',
    'Tahun Surat:\n{{letter_year}}',
    'Tanggal Surat Dibuat:\n{{letter_date}}',
    '',
    ...localPlaceholders.map((field) => `${fieldLabel(field)}:\n{{${field}}}`),
  ].join('\n\n');
}

function defaultPlaceholders(typeCode) {
  return [...new Set([...GLOBAL_NUMBERING_PLACEHOLDERS, ...COMMON_PLACEHOLDERS, ...(PLACEHOLDERS_BY_TYPE[typeCode] ?? [])])];
}

async function findLetterType(typeCode) {
  const letterType = await prisma.letterType.findFirst({
    where: { typeCode, isActive: true },
    include: { category: true },
  });
  if (!letterType) {
    throw new Error(`Active letter type not found for code ${typeCode}. Run npm run migrate:letter-master:2026 first.`);
  }
  return letterType;
}

async function upsertTemplate(item) {
  const sourcePath = path.join(sourceDir, item.fileName);
  if (!fs.existsSync(sourcePath)) throw new Error(`File not found: ${sourcePath}`);

  const letterType = await findLetterType(item.typeCode);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFileName = slugFileName(item.fileName);
  const targetPath = path.join(targetDir, targetFileName);
  fs.copyFileSync(sourcePath, targetPath);

  const relativePath = path.relative(path.resolve(__dirname, '..'), targetPath);
  const extractedPlaceholders = extractPlaceholders(targetPath);
  const placeholders = [...new Set([...GLOBAL_NUMBERING_PLACEHOLDERS, ...extractedPlaceholders, ...defaultPlaceholders(item.typeCode)])];
  const templateName = templateNameFromFile(item.fileName, item.typeCode);
  const existing = await prisma.letterTemplate.findFirst({
    where: {
      categoryId: letterType.categoryId,
      templateName,
      version: 1,
    },
  });

  const data = {
    categoryId: letterType.categoryId,
    letterTypeId: letterType.id,
    templateName,
    templateContent: templateContent(placeholders, templateName),
    docxTemplatePath: relativePath,
    placeholders,
    version: 1,
    status: 'ACTIVE',
  };

  if (existing) {
    return prisma.letterTemplate.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.letterTemplate.create({ data });
}

async function main() {
  let imported = 0;
  for (const item of files) {
    const template = await upsertTemplate(item);
    imported += 1;
    console.log(`${item.typeCode} -> ${template.templateName}`);
  }
  console.log(`Imported ${imported} DOCX templates into ${path.relative(process.cwd(), targetDir)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
