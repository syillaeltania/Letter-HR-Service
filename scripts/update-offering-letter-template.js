const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const masterPath = '/Users/syilla/Downloads/Master_Offering Letter_KK.01-OL.docx';
const outputPath = path.join(root, 'templates/docx/offering-letter.docx');

const placeholders = [
  'letter_sequence',
  'letter_number',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
  'offering_city',
  'offering_date',
  'candidate_name',
  'position',
  'employment_status',
  'division',
  'subdivision',
  'start_work_date',
  'placement_location',
  'contract_period',
  'basic_salary_and_allowance_total',
  'basic_salary',
  'transport_allowance',
  'health_allowance',
  'position_allowance',
  'communication_allowance',
  'operational_allowance',
  'spouse_allowance',
  'child_allowance_1',
  'child_allowance_2',
  'child_allowance_3',
  'insurance_allowance_total',
  'bpjs_health_1_percent',
  'jht_2_percent',
  'jp_1_percent',
  'total_basic_salary_and_allowance',
  'additional_income_total',
  'transport_rental',
  'meal_allowance',
  'overtime_workday',
  'overtime_non_workday',
  'infrastructure_rental',
  'attendance_bonus',
  'kpi_bonus',
  'deduction_total',
  'pph_deduction',
  'trial_deduction',
  'bpjs_health_deduction_1_percent',
  'jht_deduction_2_percent',
  'jp_deduction_1_percent',
  'total_net_salary',
  'bpjs_health_company_4_percent',
  'jht_company_3_7_percent',
  'jp_company_2_percent',
  'jkk_company_0_24_percent',
  'jkm_company_0_3_percent',
  'total_company_bpjs_contribution',
  'additional_notes',
  'approval_letter_number',
  'approval_letter_date',
  'candidate_decision',
  'joining_date',
  'approval_city',
  'approval_date',
];

const templateContent = [
  'OFFERING LETTER',
  'Nomor: {{letter_number}}',
  '{{offering_city}}, {{offering_date}}',
  '',
  'Informasi Kandidat',
  'Nama kandidat: {{candidate_name}}',
  '',
  'Informasi Penempatan',
  'Posisi: {{position}}',
  'Status kerja: {{employment_status}}',
  'Divisi: {{division}}',
  'Subdivisi: {{subdivision}}',
  'Tanggal mulai bekerja: {{start_work_date}}',
  'Lokasi penempatan: {{placement_location}}',
  'Periode kontrak: {{contract_period}}',
  '',
  'Kompensasi',
  'Gaji pokok dan tunjangan: {{basic_salary_and_allowance_total}}',
  'Gaji pokok: {{basic_salary}}',
  'Tunjangan transportasi: {{transport_allowance}}',
  'Tunjangan kesehatan: {{health_allowance}}',
  'Tunjangan jabatan: {{position_allowance}}',
  'Tunjangan komunikasi: {{communication_allowance}}',
  'Tunjangan operasional: {{operational_allowance}}',
  'Tunjangan istri: {{spouse_allowance}}',
  'Tunjangan anak 1: {{child_allowance_1}}',
  'Tunjangan anak 2: {{child_allowance_2}}',
  'Tunjangan anak 3: {{child_allowance_3}}',
  '',
  'BPJS & Asuransi',
  'Tunjangan asuransi: {{insurance_allowance_total}}',
  'BPJS Kesehatan 1%: {{bpjs_health_1_percent}}',
  'JHT 2%: {{jht_2_percent}}',
  'JP 1%: {{jp_1_percent}}',
  'Total gaji pokok & tunjangan: {{total_basic_salary_and_allowance}}',
  '',
  'Penambahan',
  'Penambahan: {{additional_income_total}}',
  'Sewa transportasi: {{transport_rental}}',
  'Uang makan: {{meal_allowance}}',
  'Lembur hari kerja: {{overtime_workday}}',
  'Lembur non hari kerja: {{overtime_non_workday}}',
  'Sewa infrastruktur: {{infrastructure_rental}}',
  'Pemantra absensi: {{attendance_bonus}}',
  'Pemantra KPI: {{kpi_bonus}}',
  '',
  'Potongan',
  'Potongan: {{deduction_total}}',
  'Potongan PPH: {{pph_deduction}}',
  'Potongan trial: {{trial_deduction}}',
  'Iuran BPJS kesehatan 1%: {{bpjs_health_deduction_1_percent}}',
  'Iuran JHT 2%: {{jht_deduction_2_percent}}',
  'Iuran JP 1%: {{jp_deduction_1_percent}}',
  'Total gaji yang diterima: {{total_net_salary}}',
  '',
  'Info Tambahan - Iuran BPJS Dibayar Kantor',
  'BPJS kesehatan 4%: {{bpjs_health_company_4_percent}}',
  'JHT 3.7%: {{jht_company_3_7_percent}}',
  'JP 2%: {{jp_company_2_percent}}',
  'JKK 0.24%: {{jkk_company_0_24_percent}}',
  'JKM 0.3%: {{jkm_company_0_3_percent}}',
  'Total BPJS dibayar kantor: {{total_company_bpjs_contribution}}',
  '',
  'Catatan tambahan',
  '{{additional_notes}}',
  '',
  'Formulir Persetujuan',
  'Nomor surat penawaran: {{approval_letter_number}}',
  'Tanggal surat penawaran: {{approval_letter_date}}',
  'Keputusan kandidat: {{candidate_decision}}',
  'Tanggal bergabung: {{joining_date}}',
  '{{approval_city}}, {{approval_date}}',
].join('\n');

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textOf(block) {
  return (block.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) ?? [])
    .map((text) => text.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstRunProperties(block) {
  return block.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
}

function paragraphProperties(block) {
  return block.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
}

function run(value, properties = '') {
  return `<w:r>${properties}<w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r>`;
}

function replaceParagraphText(paragraph, value) {
  const openTag = paragraph.match(/^<w:p\b[^>]*>/)?.[0] ?? '<w:p>';
  return `${openTag}${paragraphProperties(paragraph)}${run(value, firstRunProperties(paragraph))}</w:p>`;
}

function replaceCellText(cell, value) {
  const paragraphs = cell.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  if (!paragraphs.length) return cell;

  const replacement = replaceParagraphText(paragraphs[0], value);
  let replaced = false;
  return cell.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (replaced) return paragraph;
    replaced = true;
    return replacement;
  });
}

function setCellParagraphAlignment(cell, alignment = 'right') {
  const paragraphs = cell.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  if (!paragraphs.length) return cell;

  const paragraph = paragraphs[0];
  const jcXml = `<w:jc w:val="${alignment}"/>`;
  const alignedParagraph = /<w:jc\b[^>]*\/>/.test(paragraph)
    ? paragraph.replace(/<w:jc\b[^>]*\/>/, jcXml)
    : /<w:pPr\b[^>]*>/.test(paragraph)
      ? paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${jcXml}`)
      : paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${jcXml}</w:pPr>`);

  let replaced = false;
  return cell.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (currentParagraph) => {
    if (replaced) return currentParagraph;
    replaced = true;
    return alignedParagraph;
  });
}

function setParagraphAlignment(paragraph, alignment = 'right') {
  const jcXml = `<w:jc w:val="${alignment}"/>`;
  if (/<w:jc\b[^>]*\/>/.test(paragraph)) return paragraph.replace(/<w:jc\b[^>]*\/>/, jcXml);
  if (/<w:pPr\b[^>]*>/.test(paragraph)) return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${jcXml}`);
  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${jcXml}</w:pPr>`);
}

function setCleanSignatureParagraphProperties(paragraph, { keepNext = false, alignment = 'center' } = {}) {
  const properties = [
    '<w:pPr>',
    '<w:keepLines/>',
    keepNext ? '<w:keepNext/>' : '',
    '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>',
    `<w:jc w:val="${alignment}"/>`,
    '</w:pPr>',
  ].join('');

  if (/<w:pPr\b[\s\S]*?<\/w:pPr>/.test(paragraph)) {
    return paragraph.replace(/<w:pPr\b[\s\S]*?<\/w:pPr>/, properties);
  }

  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1${properties}`);
}

function forceSignatureTitleLineBreak(paragraph) {
  if (textOf(paragraph) !== 'Coor. Human Capital Management') return paragraph;

  const runProperties = firstRunProperties(paragraph);
  const openTag = paragraph.match(/^<w:p\b[^>]*>/)?.[0] ?? '<w:p>';
  const properties = paragraphProperties(paragraph);
  return [
    openTag,
    properties,
    '<w:r>',
    runProperties,
    '<w:t>Coor. Human Capital</w:t>',
    '</w:r>',
    '<w:r>',
    runProperties,
    '<w:br/>',
    '<w:t>Management</w:t>',
    '</w:r>',
    '</w:p>',
  ].join('');
}

function replaceTableCells(table, replacements) {
  const cells = table.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [];
  const updated = cells.map((cell, index) =>
    Object.prototype.hasOwnProperty.call(replacements, index) ? replaceCellText(cell, replacements[index]) : cell,
  );
  let cellIndex = 0;
  return table.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, () => updated[cellIndex++] ?? '');
}

function ensureParagraphProperty(paragraph, propertyXml) {
  const propertyName = propertyXml.match(/^<w:([^\s/>]+)/)?.[1];
  if (propertyName && new RegExp(`<w:${propertyName}(\\s|/|>)`).test(paragraph)) return paragraph;
  if (/<w:pPr\b[^>]*>/.test(paragraph)) {
    return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${propertyXml}`);
  }
  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${propertyXml}</w:pPr>`);
}

function setCellWidth(cell, width) {
  const widthXml = `<w:tcW w:w="${width}" w:type="dxa"/>`;
  if (/<w:tcW\b[^>]*\/>/.test(cell)) return cell.replace(/<w:tcW\b[^>]*\/>/, widthXml);
  if (/<w:tcPr\b[^>]*>/.test(cell)) return cell.replace(/<w:tcPr\b[^>]*>/, (match) => `${match}${widthXml}`);
  return cell.replace(/(<w:tc\b[^>]*>)/, `$1<w:tcPr>${widthXml}</w:tcPr>`);
}

function keepCellContentTogether(cell, keepNext = false) {
  return cell.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    let updated = ensureParagraphProperty(paragraph, '<w:keepLines/>');
    if (keepNext) updated = ensureParagraphProperty(updated, '<w:keepNext/>');
    return updated;
  });
}

function signatureRightCell(cells, width) {
  const paragraphs = cells.flatMap((cell) => cell.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []);
  const updatedParagraphs = paragraphs.map((paragraph, index) => {
    const updatedParagraph = setCleanSignatureParagraphProperties(paragraph, {
      keepNext: index < paragraphs.length - 1,
      alignment: 'center',
    });
    return forceSignatureTitleLineBreak(updatedParagraph);
  });

  return [
    '<w:tc>',
    [
      '<w:tcPr>',
      `<w:tcW w:w="${width}" w:type="dxa"/>`,
      '<w:noWrap/>',
      '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>',
      '</w:tcPr>',
    ].join(''),
    updatedParagraphs.join(''),
    '</w:tc>',
  ].join('');
}

function emptyCell(width) {
  return [
    '<w:tc>',
    [
      '<w:tcPr>',
      `<w:tcW w:w="${width}" w:type="dxa"/>`,
      '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>',
      '</w:tcPr>',
    ].join(''),
    '<w:p><w:pPr><w:keepLines/></w:pPr></w:p>',
    '</w:tc>',
  ].join('');
}

function keepRowTogether(row) {
  if (/<w:cantSplit\/>/.test(row)) return row;
  if (/<w:trPr\b[^>]*>/.test(row)) return row.replace(/<w:trPr\b[^>]*>/, (match) => `${match}<w:cantSplit/>`);
  return row.replace(/(<w:tr\b[^>]*>)/, '$1<w:trPr><w:cantSplit/></w:trPr>');
}

function alignSignatureTableRight(table) {
  const tableWidth = 9300;
  const leftWidth = 5550;
  const rightWidth = 3750;

  let updatedTable = table.replace(
    /<w:tblPr\b[\s\S]*?<\/w:tblPr>/,
    [
      '<w:tblPr>',
      '<w:tblStyle w:val="TableGrid"/>',
      `<w:tblW w:w="${tableWidth}" w:type="dxa"/>`,
      '<w:jc w:val="center"/>',
      '<w:tblLayout w:type="fixed"/>',
      '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>',
      '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>',
      '</w:tblPr>',
    ].join(''),
  );

  updatedTable = /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/.test(updatedTable)
    ? updatedTable.replace(
        /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
        `<w:tblGrid><w:gridCol w:w="${leftWidth}"/><w:gridCol w:w="${rightWidth}"/></w:tblGrid>`,
      )
    : updatedTable.replace(
        /<\/w:tblPr>/,
        `</w:tblPr><w:tblGrid><w:gridCol w:w="${leftWidth}"/><w:gridCol w:w="${rightWidth}"/></w:tblGrid>`,
      );

  const rows = updatedTable.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
  const originalCells = rows
    .map((row) => row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [])
    .filter((cells) => cells.length)
      .map((cells) => cells[cells.length - 1]);
  if (!originalCells.length) return updatedTable;

  const singleSignatureRow = keepRowTogether(
    [
      '<w:tr>',
      '<w:trPr><w:cantSplit/></w:trPr>',
      emptyCell(leftWidth),
      signatureRightCell(originalCells, rightWidth),
      '</w:tr>',
    ].join(''),
  );

  const firstRowStart = updatedTable.indexOf(rows[0]);
  const lastRowEnd = updatedTable.indexOf(rows[rows.length - 1]) + rows[rows.length - 1].length;
  return `${updatedTable.slice(0, firstRowStart)}${singleSignatureRow}${updatedTable.slice(lastRowEnd)}`;
}

function replaceAmountCellsByComponent(table, replacements) {
  const rows = table.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
  const updatedRows = rows.map((row) => {
    const cells = row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [];
    if (cells.length < 3) return row;

    const component = textOf(cells[1]).replace(/&amp;/g, '&').trim();
    const placeholder = replacements[component];
    if (!placeholder) return row;

    const updatedCells = [...cells];
    if (!/^[1-4]$/.test(textOf(updatedCells[0]))) {
      updatedCells[0] = replaceCellText(updatedCells[0], '');
    }
    updatedCells[2] = setCellParagraphAlignment(replaceCellText(updatedCells[2], placeholder), 'right');

    let cellIndex = 0;
    return row.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, () => updatedCells[cellIndex++] ?? '');
  });

  let rowIndex = 0;
  return table.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, () => updatedRows[rowIndex++] ?? '');
}

function replaceParagraphByExactText(xml, exactText, value) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const updated = paragraphs.map((paragraph) => (textOf(paragraph) === exactText ? replaceParagraphText(paragraph, value) : paragraph));
  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updated[index++] ?? '');
}

function replaceFirstParagraphContaining(xml, marker, value) {
  let replaced = false;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (replaced || !textOf(paragraph).includes(marker)) return paragraph;
    replaced = true;
    return replaceParagraphText(paragraph, value);
  });
}

function insertParagraphBefore(xml, marker, value) {
  let inserted = false;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (inserted || !textOf(paragraph).includes(marker)) return paragraph;
    inserted = true;
    return `${replaceParagraphText(paragraph, value)}${paragraph}`;
  });
}

function updateDocxTemplate() {
  if (!fs.existsSync(masterPath)) throw new Error(`Master DOCX not found: ${masterPath}`);

  const zip = new PizZip(fs.readFileSync(masterPath));
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('word/document.xml not found in Offering Letter master.');

  let xml = document.asText();
  const tables = xml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/g) ?? [];
  if (tables.length < 2) throw new Error('Offering Letter master layout is missing expected tables.');

  const headerTable = replaceTableCells(tables[0], {
    2: '{{letter_number}}',
    3: '{{offering_city}}, {{offering_date}}',
  });

  const compensationTable = replaceAmountCellsByComponent(tables[1], {
    'Gaji Pokok dan Tunjangan': '{{basic_salary_and_allowance_total}}',
    'Gaji Pokok': '{{basic_salary}}',
    'Tunjangan Transportasi': '{{transport_allowance}}',
    'Tunjangan Kesehatan': '{{health_allowance}}',
    'Tunjangan Jabatan': '{{position_allowance}}',
    'Tunjangan Komunikasi': '{{communication_allowance}}',
    'Tunjangan Operasional': '{{operational_allowance}}',
    'Tunjangan Istri': '{{spouse_allowance}}',
    'Tunjangan Anak 1': '{{child_allowance_1}}',
    'Tunjangan Anak 2': '{{child_allowance_2}}',
    'Tunjangan Anak 3': '{{child_allowance_3}}',
    'Tunjangan Asuransi': '{{insurance_allowance_total}}',
    'BPJS Kesehatan 1%': '{{bpjs_health_1_percent}}',
    'Jaminan Hari Tua (JHT) 2%': '{{jht_2_percent}}',
    'Jaminan Pensiun (JP) 1%': '{{jp_1_percent}}',
    'Total Gaji Pokok & Tunjangan': '{{total_basic_salary_and_allowance}}',
    'Penambahan': '{{additional_income_total}}',
    'Sewa Transportasi': '{{transport_rental}}',
    'Uang Makan': '{{meal_allowance}}',
    'Lembur Hari Kerja': '{{overtime_workday}}',
    'Lembur Non Hari Kerja': '{{overtime_non_workday}}',
    'Sewa Infrastruktur': '{{infrastructure_rental}}',
    'Pemantra Absensi': '{{attendance_bonus}}',
    'Pemantra KPI': '{{kpi_bonus}}',
    'Potongan': '{{deduction_total}}',
    'Potongan PPH': '{{pph_deduction}}',
    'Potongan Trial': '{{trial_deduction}}',
    'Iuran BPJS Kesehatan 1%': '{{bpjs_health_deduction_1_percent}}',
    'Iuran Jaminan Hari Tua (JHT) 2%': '{{jht_deduction_2_percent}}',
    'Iuran Jaminan Pensiun (JP) 1%': '{{jp_deduction_1_percent}}',
    'TOTAL GAJI YANG DITERIMA': '{{total_net_salary}}',
    'BPJS Kesehatan 4%': '{{bpjs_health_company_4_percent}}',
    'Jaminan Hari Tua (JHT) 3.7%': '{{jht_company_3_7_percent}}',
    'Jaminan Pensiun (JP) 2%': '{{jp_company_2_percent}}',
    'Jaminan Kecelakaan Kerja (JKK) 0.24%': '{{jkk_company_0_24_percent}}',
    'Jaminan Kematian (JKM) 0.3%': '{{jkm_company_0_3_percent}}',
    'Total Iuran BPJS dibayar Kantor': '{{total_company_bpjs_contribution}}',
  });

  const signatureTable = tables[3] ? alignSignatureTableRight(tables[3]) : null;

  xml = xml.replace(tables[0], headerTable).replace(tables[1], compensationTable);
  if (signatureTable) {
    xml = xml.replace(tables[3], signatureTable);
  }

  xml = replaceParagraphByExactText(xml, 'Sdr. ...', 'Sdr. {{candidate_name}}');
  xml = replaceParagraphByExactText(xml, 'Posisi:', 'Posisi\t\t\t: {{position}}');
  xml = replaceParagraphByExactText(xml, 'Status Kontrak Kerja:', 'Status Kontrak Kerja\t\t: {{employment_status}}');
  xml = replaceParagraphByExactText(xml, 'Divisi:', 'Divisi\t\t\t: {{division}}');
  xml = replaceParagraphByExactText(xml, 'Bagian/Subdivisi:', 'Bagian/Subdivisi\t\t: {{subdivision}}');
  xml = replaceParagraphByExactText(xml, 'Tanggal Mulai Bekerja:', 'Tanggal Mulai Bekerja\t: {{start_work_date}}');
  xml = replaceParagraphByExactText(xml, 'Lokasi Penempatan:', 'Lokasi Penempatan\t\t: {{placement_location}}');
  xml = replaceParagraphByExactText(xml, 'Periode Kontrak:', 'Periode Kontrak\t\t: {{contract_period}}');
  xml = insertParagraphBefore(xml, 'Demikian hal ini kami sampaikan', 'Catatan Tambahan: {{additional_notes}}');
  xml = replaceFirstParagraphContaining(
    xml,
    'Merujuk pada surat penawaran kerja',
    'Merujuk pada surat penawaran kerja dari PT Neuronworks Indonesia Nomor : {{approval_letter_number}} tanggal {{approval_letter_date}}, dengan ini saya menyatakan {{candidate_decision}} atas penawaran yang disampaikan dan bersedia bergabung untuk kerja terhitung mulai tanggal {{joining_date}} atau sesuai persetujuan dari perusahaan.',
  );
  xml = replaceParagraphByExactText(xml, '.................., ...... ...................... ...........', '{{approval_city}}, {{approval_date}}');
  xml = replaceParagraphByExactText(xml, '...', '{{candidate_name}}');

  zip.file('word/document.xml', xml);
  fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
  console.log(`Updated ${path.relative(root, outputPath)} from ${masterPath}`);
}

async function updateDatabaseTemplate() {
  const kkCategory = await prisma.letterCategory.findUniqueOrThrow({ where: { categoryCode: 'KK' } });
  const offeringCategory = await prisma.letterCategory.findUnique({ where: { categoryCode: 'KK.01-OL' } });
  const letterType = await prisma.letterType.findFirstOrThrow({
    where: { categoryId: kkCategory.id, typeCode: 'KK.01-OL' },
  });

  const templates = await prisma.letterTemplate.findMany({
    where: {
      templateName: 'Template Offering Letter',
      categoryId: { in: [kkCategory.id, offeringCategory?.id].filter(Boolean) },
    },
    orderBy: { version: 'asc' },
  });

  if (!templates.length) {
    throw new Error('Template Offering Letter (KK.01-OL) not found.');
  }

  for (const template of templates) {
    const updated = await prisma.letterTemplate.update({
      where: { id: template.id },
      data: {
        templateName: 'Template Offering Letter',
        templateContent,
        docxTemplatePath: 'templates/docx/offering-letter.docx',
        placeholders,
        status: 'ACTIVE',
        letterTypeId: template.categoryId === kkCategory.id ? letterType.id : null,
      },
    });

    console.log(`Updated ${updated.templateName} (${letterType.typeCode}) in template ${updated.id}.`);
  }
}

async function main() {
  updateDocxTemplate();
  await updateDatabaseTemplate();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
