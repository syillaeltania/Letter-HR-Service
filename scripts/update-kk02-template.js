const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const docxPath = path.join(root, 'templates/docx/kontrak-kerja-magang.docx');

const placeholders = [
  'letter_sequence',
  'letter_number',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
  'letter_day_name',
  'letter_day_text',
  'letter_month_text',
  'letter_year_text',
  'intern_name',
  'intern_ktp',
  'intern_birth_place',
  'intern_birth_date',
  'intern_address',
  'contract_start_date',
  'contract_end_date',
  'position',
  'department',
  'division',
  'project',
  'placement_location',
  'working_days',
  'working_hours',
  'break_hours',
  'weekend_policy',
  'basic_salary',
  'meal_allowance',
  'additional_notes',
];

const templateContent = [
  'KONTRAK KERJA MAGANG',
  'Nomor : {{letter_number}}',
  '',
  'Data Surat',
  'Tanggal surat dibuat: {{letter_date}}',
  '',
  'Data Peserta Magang',
  'Nama peserta: {{intern_name}}',
  'No. KTP: {{intern_ktp}}',
  'Tempat lahir: {{intern_birth_place}}',
  'Tanggal lahir: {{intern_birth_date}}',
  'Alamat: {{intern_address}}',
  '',
  'Data Kontrak',
  'Tanggal mulai: {{contract_start_date}}',
  'Tanggal berakhir: {{contract_end_date}}',
  '',
  'Data Jabatan',
  'Posisi: {{position}}',
  'Department: {{department}}',
  'Division: {{division}}',
  'Project: {{project}}',
  'Lokasi penempatan: {{placement_location}}',
  '',
  'Jam Kerja',
  'Hari kerja: {{working_days}}',
  'Jam kerja: {{working_hours}}',
  'Jam istirahat: {{break_hours}}',
  'Kebijakan akhir pekan: {{weekend_policy}}',
  '',
  'Data Penghasilan',
  'Gaji pokok: {{basic_salary}}',
  'Uang makan: {{meal_allowance}}',
  '',
  'Data Tambahan',
  '{{additional_notes}}',
].join('\n');

function textOf(paragraph) {
  return (paragraph.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
    .map((text) => text.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wRun(value, { bold = false, italic = false } = {}) {
  return [
    '<w:r>',
    '<w:rPr>',
    '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:eastAsia="Verdana" w:cs="Verdana"/>',
    bold ? '<w:b/><w:bCs/>' : '',
    italic ? '<w:i/><w:iCs/>' : '',
    '<w:sz w:val="20"/><w:szCs w:val="20"/>',
    '</w:rPr>',
    `<w:t xml:space="preserve">${encodeXml(value)}</w:t>`,
    '</w:r>',
  ].join('');
}

function replaceParagraphRuns(paragraph, runsXml) {
  const pPr = paragraph.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
  const openTag = paragraph.match(/^<w:p\b[^>]*>/)?.[0] ?? '<w:p>';
  return `${openTag}${pPr}${runsXml}</w:p>`;
}

function ensureTabStops(paragraph, labelStop = 1650, valueStop = 1850) {
  const tabsXml = `<w:tabs><w:tab w:val="left" w:pos="${labelStop}"/><w:tab w:val="left" w:pos="${valueStop}"/></w:tabs>`;
  if (/<w:tabs\b[\s\S]*?<\/w:tabs>/.test(paragraph)) {
    return paragraph.replace(/<w:tabs\b[\s\S]*?<\/w:tabs>/, tabsXml);
  }
  if (/<w:pPr\b[^>]*>/.test(paragraph)) {
    return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${tabsXml}`);
  }
  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${tabsXml}</w:pPr>`);
}

function ensureParagraphProperty(paragraph, propertyXml) {
  const propertyName = propertyXml.match(/^<w:([^\s/>]+)/)?.[1];
  if (propertyName && new RegExp(`<w:${propertyName}(\\s|/|>)`).test(paragraph)) return paragraph;
  if (/<w:pPr\b[^>]*>/.test(paragraph)) {
    return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${propertyXml}`);
  }
  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${propertyXml}</w:pPr>`);
}

function replaceParagraphProperty(paragraph, propertyName, propertyXml) {
  const propertyRegex = new RegExp(`<w:${propertyName}\\b[\\s\\S]*?<\\/w:${propertyName}>|<w:${propertyName}\\b[^>]*/>`);
  if (propertyRegex.test(paragraph)) return paragraph.replace(propertyRegex, propertyXml);
  return ensureParagraphProperty(paragraph, propertyXml);
}

function setParagraphSpacing(paragraph, { before = 0, after = 120, line = 240 } = {}) {
  return replaceParagraphProperty(paragraph, 'spacing', `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`);
}

function setParagraphStyle(paragraph, styleId) {
  return replaceParagraphProperty(paragraph, 'pStyle', `<w:pStyle w:val="${styleId}"/>`);
}

function keepLines(paragraph) {
  return ensureParagraphProperty(paragraph, '<w:keepLines/>');
}

function keepNext(paragraph) {
  return ensureParagraphProperty(paragraph, '<w:keepNext/>');
}

function removeRedundantBlankParagraphs(xml) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const cleaned = [];

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const previous = cleaned[cleaned.length - 1];
    const text = textOf(paragraph);
    const previousText = previous ? textOf(previous) : '';
    const nextText = paragraphs[paragraphIndex + 1] ? textOf(paragraphs[paragraphIndex + 1]) : '';

    if (!text && /^Pasal \d+$/.test(previousText)) continue;
    if (!text && /^Pasal (10|11)$/.test(nextText)) continue;
    if (!text && previous && !previousText) continue;

    cleaned.push(paragraph);
  }

  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => cleaned[index++] ?? '');
}

function applyLayoutRules(xml) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const updated = paragraphs.map((paragraph) => setParagraphSpacing(paragraph));

  for (let index = 0; index < updated.length; index += 1) {
    const text = textOf(updated[index]);
    if (/^Pasal ([1-9]|1[01])$/.test(text)) {
      updated[index] = keepNext(keepLines(setParagraphStyle(setParagraphSpacing(updated[index], { before: 0, after: 80 }), 'ContractArticleHeading')));

      const nextContentIndex = updated.findIndex((paragraph, nextIndex) => nextIndex > index && textOf(paragraph));
      if (nextContentIndex !== -1) {
        updated[nextContentIndex] = keepLines(setParagraphSpacing(updated[nextContentIndex], { before: 0, after: 120 }));
      }
    }
  }

  const signatureStart = updated.findIndex((paragraph) => textOf(paragraph) === 'PIHAK PERTAMA');
  if (signatureStart !== -1) {
    for (let index = signatureStart; index < updated.length; index += 1) {
      const text = textOf(updated[index]);
      if (!text) continue;
      updated[index] = keepLines(setParagraphSpacing(updated[index], { before: 0, after: 80 }));
      if (index < updated.length - 1) {
        updated[index] = keepNext(updated[index]);
      }
    }
  }

  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updated[index++] ?? '');
}

function ensureArticleHeadingStyle(zip) {
  const styles = zip.file('word/styles.xml');
  const xml = styles?.asText();
  if (!xml || xml.includes('w:styleId="ContractArticleHeading"')) return;

  const styleXml = [
    '<w:style w:type="paragraph" w:styleId="ContractArticleHeading">',
    '<w:name w:val="Contract Article Heading"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:uiPriority w:val="9"/>',
    '<w:qFormat/>',
    '<w:pPr>',
    '<w:keepNext/>',
    '<w:keepLines/>',
    '<w:jc w:val="center"/>',
    '<w:spacing w:before="0" w:after="80" w:line="240" w:lineRule="auto"/>',
    '</w:pPr>',
    '<w:rPr>',
    '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:eastAsia="Verdana" w:cs="Verdana"/>',
    '<w:b/><w:bCs/>',
    '<w:sz w:val="20"/><w:szCs w:val="20"/>',
    '</w:rPr>',
    '</w:style>',
  ].join('');

  zip.file('word/styles.xml', xml.replace('</w:styles>', `${styleXml}</w:styles>`));
}

function wTabRun() {
  return '<w:r><w:tab/></w:r>';
}

function dateOpeningParagraph(paragraph) {
  return replaceParagraphRuns(
    paragraph,
    [
      wRun('Pada hari ini, '),
      wRun('{{letter_day_name}}', { bold: true, italic: true }),
      wRun(' tanggal '),
      wRun('{{letter_day_text}}', { bold: true, italic: true }),
      wRun(' bulan '),
      wRun('{{letter_month_text}}', { bold: true, italic: true }),
      wRun(' tahun '),
      wRun('{{letter_year_text}}', { bold: true, italic: true }),
      wRun(', kami yang bertanda tangan di bawah ini :'),
    ].join(''),
  );
}

function fieldParagraph(paragraph, label, value, { boldLabel = false, boldValue = false, labelStop = 2400, valueStop = 2600 } = {}) {
  return replaceParagraphRuns(
    ensureTabStops(paragraph, labelStop, valueStop),
    [
      wRun(label, { bold: boldLabel }),
      wTabRun(),
      wRun(':'),
      wTabRun(),
      wRun(value, { bold: boldValue }),
    ].join(''),
  );
}

function tableCell(contentXml, width, { align = 'left' } = {}) {
  return [
    '<w:tc>',
    '<w:tcPr>',
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>',
    '</w:tcPr>',
    '<w:p>',
    '<w:pPr>',
    `<w:jc w:val="${align}"/>`,
    '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>',
    '</w:pPr>',
    contentXml,
    '</w:p>',
    '</w:tc>',
  ].join('');
}

function fieldTable(rows, { labelWidth = 2400, colonWidth = 220, valueWidth = 4200, indent = 850 } = {}) {
  const grid = [labelWidth, colonWidth, valueWidth].map((width) => `<w:gridCol w:w="${width}"/>`).join('');
  const tableRows = rows
    .map((row) =>
      [
        '<w:tr>',
        tableCell(wRun(row.label, { bold: row.boldLabel !== false }), labelWidth),
        tableCell(wRun(':'), colonWidth, { align: 'center' }),
        tableCell(wRun(row.value, { bold: row.boldValue }), valueWidth),
        '</w:tr>',
      ].join(''),
    )
    .join('');

  return [
    '<w:tbl>',
    '<w:tblPr>',
    '<w:tblDescription w:val="kk02-field-table"/>',
    '<w:tblW w:w="0" w:type="auto"/>',
    '<w:tblLayout w:type="fixed"/>',
    `<w:tblInd w:w="${indent}" w:type="dxa"/>`,
    '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>',
    '<w:tblBorders>',
    '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>',
    '</w:tblBorders>',
    '</w:tblPr>',
    `<w:tblGrid>${grid}</w:tblGrid>`,
    tableRows,
    '</w:tbl>',
  ].join('');
}

function signatureTable() {
  const cellPr = '<w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>';
  const cell = (text, { bold = false, after = 120 } = {}) =>
    `<w:tc>${cellPr}<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="${after}" w:line="240" w:lineRule="auto"/></w:pPr>${wRun(text, { bold })}</w:p></w:tc>`;
  const blankCell = () =>
    `<w:tc>${cellPr}<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="1900" w:line="240" w:lineRule="auto"/></w:pPr></w:p></w:tc>`;
  const row = (leftCell, rightCell) => `<w:tr>${leftCell}${rightCell}</w:tr>`;

  return [
    '<w:tbl>',
    '<w:tblPr>',
    '<w:tblDescription w:val="kk02-signature-table"/>',
    '<w:tblW w:w="9000" w:type="dxa"/>',
    '<w:tblLayout w:type="fixed"/>',
    '<w:tblBorders>',
    '<w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>',
    '</w:tblBorders>',
    '</w:tblPr>',
    '<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>',
    row(cell('PIHAK PERTAMA', { bold: true, after: 120 }), cell('PIHAK KEDUA', { bold: true, after: 120 })),
    row(blankCell(), blankCell()),
    row(cell('Ryan Nurochman', { bold: true, after: 0 }), cell('{{intern_name}}', { bold: true, after: 0 })),
    row(cell('________________________', { after: 0 }), cell('________________________', { after: 0 })),
    '</w:tbl>',
  ].join('');
}

function wordBlocks(xml) {
  return xml.match(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g) ?? [];
}

function replaceBlockRangeWithXml(xml, startIndex, endIndex, replacementXml) {
  const blocks = wordBlocks(xml);
  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g, (block) => {
    const currentIndex = index++;
    if (currentIndex === startIndex) return replacementXml;
    if (currentIndex > startIndex && currentIndex <= endIndex) return '';
    return block;
  });
}

function replaceParagraphRangeWithXml(xml, startIndex, endIndex, replacementXml) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const currentIndex = index++;
    if (currentIndex === startIndex) return replacementXml;
    if (currentIndex > startIndex && currentIndex <= endIndex) return '';
    return paragraph;
  });
}

function updateSignatureBlock(xml) {
  const blocks = wordBlocks(xml);
  const markerIndex = blocks.findIndex((block) => block.includes('kk02-signature-table'));
  let startIndex = blocks.findIndex((block) => textOf(block) === 'PIHAK PERTAMA');

  if (markerIndex !== -1 && (startIndex === -1 || startIndex > markerIndex)) {
    startIndex = markerIndex;
  }
  if (startIndex === -1) return xml;

  let endIndex = blocks.findIndex((block, index) => index > startIndex && textOf(block) === '________________________');
  const secondLineIndex = blocks.findIndex((block, index) => index > endIndex && textOf(block) === '________________________');
  if (secondLineIndex !== -1) endIndex = secondLineIndex;

  if (endIndex === -1 && markerIndex !== -1) endIndex = markerIndex;
  if (endIndex === -1) return xml;

  return replaceBlockRangeWithXml(xml, startIndex, endIndex, signatureTable());
}

function removeTrailingEmptySignatureTables(xml) {
  const blocks = wordBlocks(xml);
  const markerIndex = blocks.findIndex((block) => block.includes('kk02-signature-table'));
  if (markerIndex === -1) return xml;

  let output = xml;
  for (let index = blocks.length - 1; index > markerIndex; index -= 1) {
    const block = blocks[index];
    if (!block.startsWith('<w:tbl') || textOf(block)) continue;

    output = output.replace(block, '');
    break;
  }
  return output;
}

function contractPeriodParagraph(paragraph) {
  return replaceParagraphRuns(
    paragraph,
    [
      wRun('Bahwa perjanjian kerja magang ini diadakan dari tanggal '),
      wRun('{{contract_start_date}} s/d {{contract_end_date}}', { bold: true }),
      wRun(' atas persetujuan kedua belah pihak.'),
    ].join(''),
  );
}

function updateFieldTables(xml) {
  if (xml.includes('kk02-field-table')) return xml;
  let output = xml;

  const replaceContiguousFieldSet = (findStart, rows, tableOptions) => {
    const paragraphs = output.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const startIndex = paragraphs.findIndex((paragraph, index) => findStart(paragraph, index, paragraphs));
    if (startIndex === -1) return;

    const endIndex = startIndex + rows.length - 1;
    const isContiguous = rows.every((row, offset) => {
      const paragraph = paragraphs[startIndex + offset];
      return paragraph && row.match(textOf(paragraph));
    });
    if (!isContiguous) return;

    output = replaceParagraphRangeWithXml(output, startIndex, endIndex, fieldTable(rows, tableOptions));
  };

  replaceContiguousFieldSet(
    (paragraph, index, paragraphs) =>
      /^Nama\s*:/.test(textOf(paragraph)) &&
      /^Jabatan\s*:/.test(textOf(paragraphs[index + 1] ?? '')) &&
      /^NIK\s*:/.test(textOf(paragraphs[index + 2] ?? '')),
    [
      { match: (text) => /^Nama\s*:/.test(text), label: 'Nama', value: 'Ryan Nurochman', boldValue: true },
      { match: (text) => /^Jabatan\s*:/.test(text), label: 'Jabatan', value: 'Coordinator HCM', boldValue: true },
      { match: (text) => /^NIK\s*:/.test(text), label: 'NIK', value: '1931710098', boldValue: true },
    ],
    { labelWidth: 1200, colonWidth: 220, valueWidth: 4200, indent: 850 },
  );

  replaceContiguousFieldSet(
    (paragraph, index, paragraphs) =>
      /^Nama\s*:/.test(textOf(paragraph)) &&
      /^No\.?\s*KTP\s*:/.test(textOf(paragraphs[index + 1] ?? '')) &&
      /^Tempat\s*\/\s*Tgl Lahir\s*:/.test(textOf(paragraphs[index + 2] ?? '')) &&
      /^Alamat\s*:/.test(textOf(paragraphs[index + 3] ?? '')),
    [
      { match: (text) => /^Nama\s*:/.test(text), label: 'Nama', value: '{{intern_name}}' },
      { match: (text) => /^No\.?\s*KTP\s*:/.test(text), label: 'No. KTP', value: '{{intern_ktp}}', boldLabel: true },
      {
        match: (text) => /^Tempat\s*\/\s*Tgl Lahir\s*:/.test(text),
        label: 'Tempat / Tgl Lahir',
        value: '{{intern_birth_place_date}}',
        boldLabel: true,
      },
      { match: (text) => /^Alamat\s*:/.test(text), label: 'Alamat', value: '{{intern_address}}', boldLabel: true },
    ],
    { labelWidth: 2450, colonWidth: 220, valueWidth: 4300, indent: 850 },
  );

  replaceContiguousFieldSet(
    (paragraph, index, paragraphs) =>
      /^Yaitu\s*:/.test(textOf(paragraph)) &&
      /^Istirahat\s*:/.test(textOf(paragraphs[index + 1] ?? '')) &&
      /^Hari Sabtu\s*:/.test(textOf(paragraphs[index + 2] ?? '')),
    [
      { match: (text) => /^Yaitu\s*:/.test(text), label: 'Yaitu', value: '{{working_schedule}}' },
      { match: (text) => /^Istirahat\s*:/.test(text), label: 'Istirahat', value: '{{break_hours}}' },
      { match: (text) => /^Hari Sabtu\s*:/.test(text), label: 'Hari Sabtu', value: '{{weekend_policy}}' },
    ],
    { labelWidth: 1350, colonWidth: 220, valueWidth: 4800, indent: 0 },
  );

  replaceContiguousFieldSet(
    (paragraph, index, paragraphs) =>
      /^Gaji Pokok\s*:/.test(textOf(paragraph)) && /^Uang Makan\s*:/.test(textOf(paragraphs[index + 1] ?? '')),
    [
      { match: (text) => /^Gaji Pokok\s*:/.test(text), label: 'Gaji Pokok', value: '{{basic_salary_monthly}}' },
      { match: (text) => /^Uang Makan\s*:/.test(text), label: 'Uang Makan', value: '{{meal_allowance_daily}}' },
    ],
    { labelWidth: 1650, colonWidth: 220, valueWidth: 4200, indent: 850 },
  );

  return output;
}

function normalizeFieldTables(xml) {
  const tables = [
    fieldTable(
      [
        { label: 'Nama', value: 'Ryan Nurochman', boldValue: true },
        { label: 'Jabatan', value: 'Coordinator HCM', boldValue: true },
        { label: 'NIK', value: '1931710098', boldValue: true },
      ],
      { labelWidth: 1200, colonWidth: 220, valueWidth: 4200, indent: 850 },
    ),
    fieldTable(
      [
        { label: 'Nama', value: '{{intern_name}}' },
        { label: 'No. KTP', value: '{{intern_ktp}}' },
        { label: 'Tempat / Tgl Lahir', value: '{{intern_birth_place_date}}' },
        { label: 'Alamat', value: '{{intern_address}}' },
      ],
      { labelWidth: 2450, colonWidth: 220, valueWidth: 4300, indent: 850 },
    ),
    fieldTable(
      [
        { label: 'Yaitu', value: '{{working_schedule}}' },
        { label: 'Istirahat', value: '{{break_hours}}' },
        { label: 'Hari Sabtu', value: '{{weekend_policy}}' },
      ],
      { labelWidth: 1350, colonWidth: 220, valueWidth: 4800, indent: 0 },
    ),
    fieldTable(
      [
        { label: 'Gaji Pokok', value: '{{basic_salary_monthly}}' },
        { label: 'Uang Makan', value: '{{meal_allowance_daily}}' },
      ],
      { labelWidth: 1650, colonWidth: 220, valueWidth: 4200, indent: 850 },
    ),
  ];

  let tableIndex = 0;
  return xml.replace(
    /<w:tbl>(?:(?!<\/w:tbl>)[\s\S])*?<w:tblDescription w:val="kk02-field-table"\/>(?:(?!<\/w:tbl>)[\s\S])*?<\/w:tbl>/g,
    (tableXml) => {
    if (!tableXml.includes('kk02-field-table')) return tableXml;
    const replacement = tables[tableIndex] ?? tableXml;
    tableIndex += 1;
    return replacement;
    },
  );
}

function replaceParagraphText(paragraph, value) {
  const matches = [...paragraph.matchAll(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g)];
  if (!matches.length) {
    return paragraph.replace(/(<w:r\b[^>]*>)/, `$1<w:t xml:space="preserve">${encodeXml(value)}</w:t>`);
  }

  let output = paragraph;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const replacement =
      index === 0
        ? match[0].replace(/(<w:t\b[^>]*>)[\s\S]*?(<\/w:t>)/, `$1${encodeXml(value)}$2`)
        : match[0].replace(/(<w:t\b[^>]*>)[\s\S]*?(<\/w:t>)/, '$1$2');
    output = `${output.slice(0, match.index)}${replacement}${output.slice(match.index + match[0].length)}`;
  }
  return output;
}

function paragraphLike(xml, value) {
  const paragraph = xml.match(/<w:p\b[\s\S]*?<\/w:p>/)?.[0];
  if (!paragraph) return `<w:p><w:r><w:t>${encodeXml(value)}</w:t></w:r></w:p>`;
  return replaceParagraphText(paragraph, value);
}

function replaceParagraphs(xml, replacements) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const updated = paragraphs.map((paragraph) => {
    const text = textOf(paragraph);
    const replacement = replacements.find((item) => item.match(text));
    if (!replacement) return paragraph;
    return replacement.render ? replacement.render(paragraph) : replaceParagraphText(paragraph, replacement.value);
  });

  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updated[index++] ?? '');
}

function insertAdditionalNotesBeforePasal11(xml, sourceXml) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const cleaned = paragraphs.filter((paragraph) => textOf(paragraph) !== '{{additional_notes}}');
  const pasal11Index = cleaned.findIndex((paragraph) => textOf(paragraph) === 'Pasal 11');
  if (pasal11Index === -1) return xml;

  cleaned.splice(pasal11Index, 0, paragraphLike(sourceXml, '{{additional_notes}}'));
  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => cleaned[index++] ?? '');
}

function updateDocx() {
  const zip = new PizZip(fs.readFileSync(docxPath));
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('word/document.xml not found in KK.02 template.');
  ensureArticleHeadingStyle(zip);

  let xml = document.asText()
    .replaceAll('{{employee_name}}', '{{intern_name}}')
    .replaceAll('{{employee_id_number}}', '{{intern_ktp}}')
    .replaceAll('{{employee_birth_place_date}}', '{{intern_birth_place_date}}')
    .replaceAll('{{employee_address}}', '{{intern_address}}')
    .replaceAll('{{meal_transport_allowance}}', '{{meal_allowance}}')
    .replaceAll('{{signer_name}}', 'Ryan Nurochman')
    .replaceAll('{{signer_position}}', 'Coordinator HCM')
    .replaceAll('{{signer_nik}}', '1931710098')
    .replaceAll('Sriyanto', 'Ryan Nurochman')
    .replaceAll('Direktur', 'Coordinator HCM')
    .replaceAll('1800802001', '1931710098');

  xml = replaceParagraphs(xml, [
    { match: (text) => text === '{{letter_number}}' || text === 'Nomor : {{letter_number}}', value: 'Nomor : {{letter_number}}' },
    {
      match: (text) => text.startsWith('Pada hari ini,'),
      render: dateOpeningParagraph,
    },
    {
      match: (text) =>
        text.startsWith('Bahwa perjanjian kerja ini diadakan dari tanggal') ||
        text.startsWith('Bahwa perjanjian kerja magang ini diadakan dari tanggal'),
      render: contractPeriodParagraph,
    },
    {
      match: (text) => text.startsWith('Yaitu:'),
      render: (paragraph) =>
        fieldParagraph(paragraph, 'Yaitu', '{{working_schedule}}', { labelStop: 1450, valueStop: 1650 }),
    },
    {
      match: (text) => /^Istirahat\s*:/.test(text),
      render: (paragraph) => fieldParagraph(paragraph, 'Istirahat', '{{break_hours}}', { labelStop: 1450, valueStop: 1650 }),
    },
    {
      match: (text) => /^Hari Sabtu\s*:/.test(text),
      render: (paragraph) => fieldParagraph(paragraph, 'Hari Sabtu', '{{weekend_policy}}', { labelStop: 1450, valueStop: 1650 }),
    },
    {
      match: (text) => text.startsWith('Bahwa Pihak Pertama akan menempatkan Pihak Kedua'),
      value:
        'Bahwa Pihak Pertama akan menempatkan Pihak Kedua pada posisi {{position}} di {{department}} / {{division}} untuk {{project}} dengan lokasi penempatan {{placement_location}} dan status Peserta Magang.',
    },
    {
      match: (text) => text.startsWith('Gaji Pokok'),
      render: (paragraph) => fieldParagraph(paragraph, 'Gaji Pokok', '{{basic_salary_monthly}}', { labelStop: 1650, valueStop: 1850 }),
    },
    {
      match: (text) => text.startsWith('Uang Makan'),
      render: (paragraph) => fieldParagraph(paragraph, 'Uang Makan', '{{meal_allowance_daily}}', { labelStop: 1650, valueStop: 1850 }),
    },
    { match: (text) => text === '__________________', value: '' },
    { match: (text) => text === 'Ryan Nurochman', value: 'Ryan Nurochman' },
    { match: (text) => text === '{{intern_name}}', value: '{{intern_name}}' },
  ]);

  xml = normalizeFieldTables(updateFieldTables(xml));
  xml = insertAdditionalNotesBeforePasal11(xml, document.asText());
  xml = removeRedundantBlankParagraphs(xml);
  xml = applyLayoutRules(xml);
  xml = updateSignatureBlock(xml);
  xml = removeTrailingEmptySignatureTables(xml);

  if (!xml.includes('kk02-signature-table') && !textOf(xml).includes('NIK. 1931710098') && xml.includes('<w:t>Ryan Nurochman</w:t>')) {
    xml = xml.replace(
      /(<w:p\b[\s\S]*?<w:t[^>]*>Ryan Nurochman<\/w:t>[\s\S]*?<\/w:p>)/,
      `$1${paragraphLike(document.asText(), 'Coordinator HCM')}${paragraphLike(document.asText(), 'NIK. 1931710098')}`,
    );
  }

  zip.file('word/document.xml', xml);
  fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
}

async function updateDatabase() {
  const letterType = await prisma.letterType.findFirstOrThrow({
    where: { typeCode: 'KK.02', isActive: true },
    include: { category: true },
  });
  const template = await prisma.letterTemplate.findFirstOrThrow({
    where: {
      categoryId: letterType.categoryId,
      templateName: { contains: 'Magang', mode: 'insensitive' },
    },
  });

  await prisma.letterTemplate.update({
    where: { id: template.id },
    data: {
      templateName: 'Template Kontrak Kerja Magang',
      categoryId: letterType.categoryId,
      letterTypeId: letterType.id,
      docxTemplatePath: 'templates/docx/kontrak-kerja-magang.docx',
      templateContent,
      placeholders,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  updateDocx();
  await updateDatabase();
  console.log('Updated KK.02 internship contract template.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
