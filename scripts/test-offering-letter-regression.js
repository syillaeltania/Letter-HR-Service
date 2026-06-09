const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'templates/docx/offering-letter.docx');

const renderData = {
  letter_number: 'NW-001/KK.01-OL/HCM/VI/2026',
  letter_sequence: '001',
  letter_type_code: 'KK.01-OL',
  letter_month_roman: 'VI',
  letter_year: '2026',
  letter_date: '2026-06-12',
  offering_city: 'Bandung',
  offering_date: '2026-06-23',
  candidate_name: 'Syilla Eltania Daffa',
  position: 'HR Officer',
  employment_status: 'Karyawan Kontrak',
  division: 'People Operations',
  subdivision: 'HCM',
  start_work_date: '2026-07-01',
  placement_location: 'Bandung',
  contract_period: '1 tahun',
  basic_salary_and_allowance_total: 'Rp 6.400.000',
  basic_salary: 'Rp 5.000.000',
  transport_allowance: 'Rp 300.000',
  health_allowance: 'Rp 300.000',
  position_allowance: 'Rp 500.000',
  communication_allowance: 'Rp 100.000',
  operational_allowance: 'Rp 200.000',
  spouse_allowance: '',
  child_allowance_1: '',
  child_allowance_2: '',
  child_allowance_3: '',
  insurance_allowance_total: 'Rp 300.000',
  bpjs_health_1_percent: 'Rp 100.000',
  jht_2_percent: 'Rp 150.000',
  jp_1_percent: 'Rp 50.000',
  total_basic_salary_and_allowance: 'Rp 6.700.000',
  additional_income_total: 'Rp 700.000',
  transport_rental: '',
  meal_allowance: 'Rp 500.000',
  overtime_workday: '',
  overtime_non_workday: '',
  infrastructure_rental: '',
  attendance_bonus: 'Rp 100.000',
  kpi_bonus: 'Rp 100.000',
  deduction_total: 'Rp 250.000',
  pph_deduction: '',
  trial_deduction: '',
  bpjs_health_deduction_1_percent: 'Rp 50.000',
  jht_deduction_2_percent: 'Rp 150.000',
  jp_deduction_1_percent: 'Rp 50.000',
  total_net_salary: 'Rp 7.150.000',
  bpjs_health_company_4_percent: 'Rp 200.000',
  jht_company_3_7_percent: 'Rp 185.000',
  jp_company_2_percent: 'Rp 100.000',
  jkk_company_0_24_percent: 'Rp 12.000',
  jkm_company_0_3_percent: 'Rp 15.000',
  total_company_bpjs_contribution: 'Rp 512.000',
  additional_notes: '',
  approval_letter_number: 'NW-001/KK.01-OL/HCM/VI/2026',
  approval_letter_date: '2026-06-23',
  candidate_decision: 'SETUJU',
  joining_date: '2026-07-01',
  approval_city: 'Bandung',
  approval_date: '2026-06-23',
};

const template = fs.readFileSync(templatePath);
const doc = new Docxtemplater(new PizZip(template), {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: '{{', end: '}}' },
  nullGetter: () => '',
});

doc.render(renderData);

const outputZip = new PizZip(doc.getZip().generate({ type: 'nodebuffer' }));
const documentXml = outputZip.file('word/document.xml').asText();
const documentText = documentXml.replace(/<[^>]+>/g, '');

assert.match(documentText, /Sdr\. Syilla Eltania Daffa/);
assert.doesNotMatch(documentText, /Sdr\. 2026-06-12/);
assert.doesNotMatch(documentText, /Sdr\. 2026-06-23/);
assert.doesNotMatch(documentText, /Sdr\. 2026-07-01/);
assert.doesNotMatch(documentText, /undefined|null|NaN/);

const compensationTable = (documentXml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/g) ?? [])[1];
assert.ok(compensationTable, 'Offering Letter compensation table should exist.');
const rows = compensationTable.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];

function rowCells(rowIndex) {
  return (rows[rowIndex].match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map((cell) =>
    (cell.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? [])
      .map((text) => text.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

assert.deepEqual(rowCells(1), ['1', 'Gaji Pokok dan Tunjangan', 'Rp 6.400.000']);
assert.deepEqual(rowCells(2), ['', 'Gaji Pokok', 'Rp 5.000.000']);
assert.deepEqual(rowCells(3), ['', 'Tunjangan Transportasi', 'Rp 300.000']);
assert.deepEqual(rowCells(4), ['', 'Tunjangan Kesehatan', 'Rp 300.000']);
assert.deepEqual(rowCells(12), ['2', 'Tunjangan Asuransi', 'Rp 300.000']);
assert.deepEqual(rowCells(16), ['', 'Total Gaji Pokok &amp; Tunjangan', 'Rp 6.700.000']);
assert.deepEqual(rowCells(17), ['3', 'Penambahan', 'Rp 700.000']);
assert.deepEqual(rowCells(25), ['4', 'Potongan', 'Rp 250.000']);
assert.deepEqual(rowCells(31), ['', 'TOTAL GAJI YANG DITERIMA', 'Rp 7.150.000']);
assert.deepEqual(rowCells(38), ['', 'Total Iuran BPJS dibayar Kantor', 'Rp 512.000']);

console.log('Offering Letter regression passed.');
