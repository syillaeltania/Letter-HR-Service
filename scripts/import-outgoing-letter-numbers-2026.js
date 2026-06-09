const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const workbookPath =
  process.env.OUTGOING_LETTER_XLSX || '/Users/syilla/Downloads/Nomor Surat Keluar HCM 2026.xlsx';

const SKIPPED_SHEETS = new Set([
  'List Nomor Surat',
  'Tracking KK',
  'List Permohonan Surat',
  'Pakta Integritas',
]);
const ROMAN_MONTHS = new Map([
  ['I', 1],
  ['II', 2],
  ['III', 3],
  ['IV', 4],
  ['V', 5],
  ['VI', 6],
  ['VII', 7],
  ['VIII', 8],
  ['IX', 9],
  ['X', 10],
  ['XI', 11],
  ['XII', 12],
]);

function xmlDecode(value) {
  return String(value ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function attr(xml, name) {
  return xml.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
}

function colName(cellRef) {
  return String(cellRef ?? '').replace(/[0-9]/g, '');
}

function parseSharedStrings(zip) {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  const xml = file.asText();
  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map(([si]) =>
    xmlDecode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join('')),
  );
}

function parseWorkbookSheets(zip) {
  const workbook = zip.file('xl/workbook.xml').asText();
  const rels = zip.file('xl/_rels/workbook.xml.rels').asText();
  const targetById = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );

  return [...workbook.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)].map((match) => {
    const target = targetById.get(match[2]);
    return {
      name: xmlDecode(match[1]),
      path: target.startsWith('xl/') ? target : `xl/${target}`,
    };
  });
}

function parseRows(zip, sheetPath, sharedStrings) {
  const xml = zip.file(sheetPath).asText();
  return [...xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const values = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const ref = attr(attributes, 'r');
      const type = attr(attributes, 't');
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      let value = '';

      if (type === 's') value = sharedStrings[Number(v)] ?? '';
      else if (type === 'inlineStr') {
        value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join('');
      } else value = v;

      values[colName(ref)] = xmlDecode(value);
    }
    return { number: Number(rowMatch[1]), values };
  });
}

function findHeader(rows) {
  for (const row of rows) {
    const entries = Object.entries(row.values);
    const numberColumn = entries.find(([, value]) => String(value).toLowerCase().includes('nomor surat'))?.[0];
    if (!numberColumn) continue;
    const hasTableMarker = entries.some(([, value]) => ['no.', 'no', 'tanggal'].includes(String(value).toLowerCase()));
    if (!hasTableMarker) continue;

    return {
      row: row.number,
      numberColumn,
      dateColumn: entries.find(([, value]) => String(value).toLowerCase() === 'tanggal')?.[0],
      subjectColumn: entries.find(([, value]) => String(value).toLowerCase() === 'perihal')?.[0],
      employeeColumn: entries.find(([, value]) => ['nama pegawai', 'nama'].includes(String(value).toLowerCase()))?.[0],
      statusColumn: entries.find(([, value]) => String(value).toLowerCase() === 'status')?.[0],
      positionColumn: entries.find(([, value]) => String(value).toLowerCase() === 'posisi')?.[0],
    };
  }
  return null;
}

function excelDate(value, fallbackMonth, fallbackYear) {
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 0) {
    return new Date(Date.UTC(1899, 11, 30 + serial));
  }
  return new Date(Date.UTC(fallbackYear, fallbackMonth - 1, 1));
}

function parseLetterNumber(value) {
  const letterNumber = String(value ?? '').trim();
  const match = letterNumber.match(/^NW-(\d{3})\/([^/]+)\/HCM\/([IVXLCDM]+)\/(\d{4})$/);
  if (!match) return null;
  return {
    letterNumber,
    sequence: Number(match[1]),
    code: match[2],
    month: ROMAN_MONTHS.get(match[3]) ?? 1,
    year: Number(match[4]),
  };
}

function sheetTitle(rows, fallback) {
  const first = rows
    .flatMap((row) => Object.values(row.values))
    .find((value) => String(value).trim() && !/^\d+$/.test(String(value).trim()));
  return xmlDecode(first) || fallback;
}

function buildSubject(row, header, title) {
  const subject = header.subjectColumn ? row.values[header.subjectColumn] : '';
  if (subject) return subject;
  const status = header.statusColumn ? row.values[header.statusColumn] : '';
  const position = header.positionColumn ? row.values[header.positionColumn] : '';
  return [title, status, position].filter(Boolean).join(' - ');
}

function extractRecords(zip) {
  const sharedStrings = parseSharedStrings(zip);
  const records = [];

  for (const sheet of parseWorkbookSheets(zip)) {
    if (SKIPPED_SHEETS.has(sheet.name.trim())) continue;
    const rows = parseRows(zip, sheet.path, sharedStrings);
    const header = findHeader(rows);
    if (!header) continue;
    const title = sheetTitle(rows, sheet.name);

    for (const row of rows.filter((item) => item.number > header.row)) {
      const parsed = parseLetterNumber(row.values[header.numberColumn]);
      if (!parsed) continue;
      const subject = buildSubject(row, header, title);
      const employeeName = header.employeeColumn ? row.values[header.employeeColumn] : '';
      const createdAt = excelDate(row.values[header.dateColumn], parsed.month, parsed.year);

      records.push({
        ...parsed,
        sheetName: sheet.name.trim(),
        title,
        subject,
        employeeName,
        createdAt,
      });
    }
  }

  return records;
}

async function ensureCategoryAndTemplate(code, title) {
  const categoryName = `${title} - ${code}`;
  const numberingFormat = `NW-{{sequence}}/${code}/HCM/{{roman_month}}/{{year}}`;
  const category = await prisma.letterCategory.upsert({
    where: { categoryCode: code },
    update: {},
    create: {
      categoryCode: code,
      categoryName,
      numberingFormat,
      isActive: true,
    },
  });

  const existingTemplate = await prisma.letterTemplate.findFirst({
    where: { categoryId: category.id },
    orderBy: [{ status: 'asc' }, { version: 'desc' }],
  });
  if (existingTemplate) return { category, template: existingTemplate };

  const template = await prisma.letterTemplate.create({
    data: {
      categoryId: category.id,
      templateName: `Template ${categoryName}`,
      templateContent: [
        '{{letter_number}}',
        '',
        'Perihal: {{subject}}',
        'Nama: {{employee_name}}',
      ].join('\n'),
      placeholders: ['letter_number', 'subject', 'employee_name'],
      version: 1,
      status: 'ACTIVE',
    },
  });

  return { category, template };
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Excel file not found: ${workbookPath}`);
  }

  const zip = new PizZip(fs.readFileSync(workbookPath));
  const records = extractRecords(zip);
  const uniqueRecords = [...new Map(records.map((record) => [record.letterNumber, record])).values()];

  const creator =
    (await prisma.user.findFirst({ where: { role: 'ADMIN_HR' }, orderBy: { createdAt: 'asc' } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
  if (!creator) throw new Error('No user found. Run npm run seed before importing outgoing letter numbers.');

  let inserted = 0;
  let skipped = 0;
  const sequenceMax = new Map();
  const categoryByCode = new Map();

  for (const record of uniqueRecords) {
    let categoryTemplate = categoryByCode.get(record.code);
    if (!categoryTemplate) {
      categoryTemplate = await ensureCategoryAndTemplate(record.code, record.title);
      categoryByCode.set(record.code, categoryTemplate);
    }

    const existing = await prisma.letter.findUnique({ where: { letterNumber: record.letterNumber } });
    if (existing) {
      const existingContent = existing.content && typeof existing.content === 'object' ? existing.content : {};
      await prisma.letter.update({
        where: { id: existing.id },
        data: {
          categoryId: categoryTemplate.category.id,
          templateId: categoryTemplate.template.id,
          content: {
            ...existingContent,
            subject: record.subject,
            perihal: record.subject,
            employee_name: record.employeeName,
            imported_from: path.basename(workbookPath),
            imported_sheet: record.sheetName,
          },
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
          approvedAt: record.createdAt,
          publishedAt: record.createdAt,
        },
      });
      skipped += 1;
    } else {
      await prisma.letter.create({
        data: {
          letterNumber: record.letterNumber,
          categoryId: categoryTemplate.category.id,
          templateId: categoryTemplate.template.id,
          creatorId: creator.id,
          status: 'PUBLISHED',
          content: {
            subject: record.subject,
            perihal: record.subject,
            employee_name: record.employeeName,
            imported_from: path.basename(workbookPath),
            imported_sheet: record.sheetName,
          },
          approvedAt: record.createdAt,
          publishedAt: record.createdAt,
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
        },
      });
      inserted += 1;
    }

    const sequenceKey = `${categoryTemplate.category.id}:${record.month}:${record.year}`;
    sequenceMax.set(sequenceKey, {
      categoryId: categoryTemplate.category.id,
      month: record.month,
      year: record.year,
      currentNumber: Math.max(sequenceMax.get(sequenceKey)?.currentNumber ?? 0, record.sequence),
    });
  }

  for (const sequence of sequenceMax.values()) {
    const existing = await prisma.letterNumberSequence.findUnique({
      where: {
        categoryId_month_year: {
          categoryId: sequence.categoryId,
          month: sequence.month,
          year: sequence.year,
        },
      },
    });
    const currentNumber = Math.max(existing?.currentNumber ?? 0, sequence.currentNumber);

    await prisma.letterNumberSequence.upsert({
      where: {
        categoryId_month_year: {
          categoryId: sequence.categoryId,
          month: sequence.month,
          year: sequence.year,
        },
      },
      create: { ...sequence, currentNumber },
      update: { currentNumber: { set: currentNumber } },
    });
  }

  console.log(`Parsed ${records.length} rows with valid letter numbers.`);
  console.log(`Imported ${inserted} new letters, skipped ${skipped} existing letters.`);
  console.log(`Updated ${sequenceMax.size} category/month/year sequences.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
