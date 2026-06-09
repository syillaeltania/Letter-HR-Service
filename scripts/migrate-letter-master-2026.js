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

const CATEGORY_BY_SHEET = {
  'Peraturan Perusahaan': { categoryName: 'Peraturan Perusahaan', categoryCode: 'PP' },
  'Surat Keputusan': { categoryName: 'Surat Keputusan', categoryCode: 'SK' },
  'Surat Pemberitahuan': { categoryName: 'Surat Pemberitahuan', categoryCode: 'SPB' },
  'Surat Keterangan Bekerja': { categoryName: 'Surat Keterangan', categoryCode: 'SKB' },
  'Surat Edaran': { categoryName: 'Surat Edaran', categoryCode: 'SE' },
  'Surat Perjanjian': { categoryName: 'Surat Perjanjian Kerja', categoryCode: 'SPK' },
  'Surat Peringatan': { categoryName: 'Surat Peringatan', categoryCode: 'SP' },
  'Surat Tugas': { categoryName: 'Surat Tugas', categoryCode: 'ST' },
  'Kontrak Kerja': { categoryName: 'Kontrak Kerja', categoryCode: 'KK' },
};

const FALLBACK_TYPES = {
  'Peraturan Perusahaan': [{ typeCode: 'PP', typeName: 'Peraturan Perusahaan' }],
  'Surat Edaran': [{ typeCode: 'SE', typeName: 'Surat Edaran' }],
  'Surat Peringatan': [
    { typeCode: 'SP.01', typeName: 'Surat Peringatan 1' },
    { typeCode: 'SP.02', typeName: 'Surat Peringatan 2' },
    { typeCode: 'SP.03', typeName: 'Surat Peringatan 3' },
  ],
  'Surat Tugas': [
    { typeCode: 'ST.01', typeName: 'Surat Tugas' },
    { typeCode: 'STB', typeName: 'Surat Tugas Belajar' },
    { typeCode: 'ST.02', typeName: 'Surat Penunjukan' },
  ],
  'Kontrak Kerja': [
    { typeCode: 'KK.01', typeName: 'Kontrak Kerja Karyawan' },
    { typeCode: 'KK.02', typeName: 'Kontrak Kerja Magang' },
    { typeCode: 'KK.03', typeName: 'Kontrak Kerja Pekerja Lepas' },
    { typeCode: 'KK.01-OL', typeName: 'Offering Letter' },
  ],
};

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
const ALLOWED_BARE_TYPE_CODES = new Set(['BAST', 'NDA', 'PP', 'SE', 'STB']);

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
      else if (type === 'inlineStr') value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join('');
      else value = v;

      const decoded = xmlDecode(value);
      values[colName(ref)] = /^\d+$/.test(decoded) && sharedStrings[Number(decoded)]
        ? sharedStrings[Number(decoded)]
        : decoded;
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
  if (Number.isFinite(serial) && serial > 0) return new Date(Date.UTC(1899, 11, 30 + serial));
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

function buildSubject(row, header, title) {
  const subject = header.subjectColumn ? row.values[header.subjectColumn] : '';
  if (subject) return subject;
  const status = header.statusColumn ? row.values[header.statusColumn] : '';
  const position = header.positionColumn ? row.values[header.positionColumn] : '';
  return [title, status, position].filter(Boolean).join(' - ');
}

function extractTypeDefinitions(rows, headerRow, sheetName) {
  const byCode = new Map();
  const candidates = rows
    .filter((row) => row.number < headerRow)
    .flatMap((row) => Object.values(row.values))
    .map((value) => xmlDecode(value));

  for (const text of candidates) {
    const codes = [...text.matchAll(/\b([A-Z]{2,4}(?:\.\d{2})?(?:-[A-Z]{2})?)\b/g)]
      .map((match) => match[1])
      .filter((code) => /\.\d{2}/.test(code) || ALLOWED_BARE_TYPE_CODES.has(code));
    for (const code of codes) {
      const typeName = text
        .replace(/\s*:\s*[A-Z]{2,4}(?:\.\d{2})?(?:-[A-Z]{2})?.*$/, '')
        .replace(/\s+-\s*[A-Z]{2,4}(?:\.\d{2})?(?:-[A-Z]{2})?.*$/, '')
        .trim();
      if (typeName && !byCode.has(code)) byCode.set(code, { typeCode: code, typeName });
    }
  }

  for (const fallback of FALLBACK_TYPES[sheetName] ?? []) byCode.set(fallback.typeCode, fallback);
  return byCode;
}

function extractWorkbookData() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Excel file not found: ${workbookPath}`);
  const zip = new PizZip(fs.readFileSync(workbookPath));
  const sharedStrings = parseSharedStrings(zip);
  const sheets = [];

  for (const sheet of parseWorkbookSheets(zip)) {
    if (SKIPPED_SHEETS.has(sheet.name.trim())) continue;
    const category = CATEGORY_BY_SHEET[sheet.name.trim()];
    if (!category) continue;
    const rows = parseRows(zip, sheet.path, sharedStrings);
    const header = findHeader(rows);
    if (!header) continue;
    const typeDefinitions = extractTypeDefinitions(rows, header.row, sheet.name.trim());
    const records = [];

    for (const row of rows.filter((item) => item.number > header.row)) {
      const parsed = parseLetterNumber(row.values[header.numberColumn]);
      if (!parsed) continue;
      const subject = buildSubject(row, header, category.categoryName);
      records.push({
        ...parsed,
        subject,
        employeeName: header.employeeColumn ? row.values[header.employeeColumn] : '',
        createdAt: excelDate(row.values[header.dateColumn], parsed.month, parsed.year),
      });
      if (!typeDefinitions.has(parsed.code)) {
        typeDefinitions.set(parsed.code, { typeCode: parsed.code, typeName: `${category.categoryName} ${parsed.code}` });
      }
    }

    sheets.push({ sheetName: sheet.name.trim(), category, typeDefinitions: [...typeDefinitions.values()], records });
  }

  return sheets;
}

async function ensureParentTemplates(parentCategory, typeDefinitions) {
  for (const definition of typeDefinitions) {
    const sourceCategory = await prisma.letterCategory.findUnique({ where: { categoryCode: definition.typeCode } });
    if (!sourceCategory) continue;
    const sourceTemplates = await prisma.letterTemplate.findMany({
      where: { categoryId: sourceCategory.id },
      orderBy: [{ status: 'asc' }, { version: 'desc' }],
    });
    for (const sourceTemplate of sourceTemplates) {
      const existingClone = await prisma.letterTemplate.findFirst({
        where: {
          categoryId: parentCategory.id,
          templateName: sourceTemplate.templateName,
          version: sourceTemplate.version,
        },
      });
      if (existingClone) continue;
      await prisma.letterTemplate.create({
        data: {
          categoryId: parentCategory.id,
          templateName: sourceTemplate.templateName,
          templateContent: sourceTemplate.templateContent,
          docxTemplatePath: sourceTemplate.docxTemplatePath,
          placeholders: sourceTemplate.placeholders,
          version: sourceTemplate.version,
          status: sourceTemplate.status,
        },
      });
    }
  }

  const existing = await prisma.letterTemplate.findFirst({
    where: { categoryId: parentCategory.id },
    orderBy: [{ status: 'asc' }, { version: 'desc' }],
  });
  if (existing) return existing;

  return prisma.letterTemplate.create({
    data: {
      categoryId: parentCategory.id,
      templateName: `Template ${parentCategory.categoryName}`,
      templateContent: ['{{letter_number}}', '', 'Perihal: {{subject}}', 'Nama: {{employee_name}}'].join('\n'),
      placeholders: ['letter_number', 'subject', 'employee_name'],
      version: 1,
      status: 'ACTIVE',
    },
  });
}

async function resolveParentTemplate(parentCategoryId, legacyTemplateId) {
  const legacyTemplate = legacyTemplateId
    ? await prisma.letterTemplate.findUnique({ where: { id: legacyTemplateId } })
    : null;
  if (legacyTemplate) {
    const clonedTemplate = await prisma.letterTemplate.findFirst({
      where: {
        categoryId: parentCategoryId,
        templateName: legacyTemplate.templateName,
        version: legacyTemplate.version,
      },
    });
    if (clonedTemplate) return clonedTemplate;
  }

  return prisma.letterTemplate.findFirst({
    where: { categoryId: parentCategoryId },
    orderBy: [{ status: 'asc' }, { version: 'desc' }],
  });
}

async function cleanupLegacyCategories(parentTypeByCode, parentCategoryCodes, sequenceMax) {
  let movedLetters = 0;
  let inactiveCategories = 0;

  for (const [typeCode, target] of parentTypeByCode.entries()) {
    if (parentCategoryCodes.has(typeCode)) continue;
    const legacyCategory = await prisma.letterCategory.findUnique({ where: { categoryCode: typeCode } });
    if (!legacyCategory || legacyCategory.id === target.category.id) continue;

    const legacyLetters = await prisma.letter.findMany({
      where: { categoryId: legacyCategory.id },
      orderBy: { createdAt: 'asc' },
    });

    for (const letter of legacyLetters) {
      const parentTemplate = await resolveParentTemplate(target.category.id, letter.templateId);
      const parsed = parseLetterNumber(letter.letterNumber ?? letter.generatedLetterNumber);
      const nextSequenceNumber = letter.sequenceNumber ?? parsed?.sequence ?? null;

      await prisma.letter.update({
        where: { id: letter.id },
        data: {
          categoryId: target.category.id,
          letterTypeId: target.type.id,
          sequenceNumber: nextSequenceNumber,
          generatedLetterNumber: letter.generatedLetterNumber ?? letter.letterNumber,
          templateId: parentTemplate?.id ?? letter.templateId,
        },
      });
      movedLetters += 1;

      if (parsed) {
        const key = `${target.category.id}:${parsed.month}:${parsed.year}`;
        sequenceMax.set(key, {
          categoryId: target.category.id,
          month: parsed.month,
          year: parsed.year,
          currentNumber: Math.max(sequenceMax.get(key)?.currentNumber ?? 0, parsed.sequence),
        });
      }
    }

    const remainingLetters = await prisma.letter.count({ where: { categoryId: legacyCategory.id } });
    if (remainingLetters === 0 && legacyCategory.isActive) {
      await prisma.letterCategory.update({
        where: { id: legacyCategory.id },
        data: { isActive: false },
      });
      inactiveCategories += 1;
    }
  }

  const categoriesWithLetters = new Set(
    (await prisma.letter.findMany({
      select: { categoryId: true },
      distinct: ['categoryId'],
    })).map((letter) => letter.categoryId),
  );

  for (const category of await prisma.letterCategory.findMany({ where: { isActive: true } })) {
    if (parentCategoryCodes.has(category.categoryCode)) continue;
    if (categoriesWithLetters.has(category.id)) continue;
    await prisma.letterCategory.update({
      where: { id: category.id },
      data: { isActive: false },
    });
    inactiveCategories += 1;
  }

  return { movedLetters, inactiveCategories };
}

async function main() {
  const sheets = extractWorkbookData();
  let categories = 0;
  let types = 0;
  let letters = 0;
  let templates = 0;
  const sequenceMax = new Map();
  const parentTypeByCode = new Map();
  const parentCategoryCodes = new Set(Object.values(CATEGORY_BY_SHEET).map((category) => category.categoryCode));

  for (const sheet of sheets) {
    const category = await prisma.letterCategory.upsert({
      where: { categoryCode: sheet.category.categoryCode },
      update: {
        categoryName: sheet.category.categoryName,
        description: `Kategori induk dari file ${path.basename(workbookPath)} sheet ${sheet.sheetName}`,
        numberingFormat: 'NW-{{sequence}}/{{type_code}}/HCM/{{roman_month}}/{{year}}',
        isActive: true,
      },
      create: {
        categoryName: sheet.category.categoryName,
        categoryCode: sheet.category.categoryCode,
        description: `Kategori induk dari file ${path.basename(workbookPath)} sheet ${sheet.sheetName}`,
        numberingFormat: 'NW-{{sequence}}/{{type_code}}/HCM/{{roman_month}}/{{year}}',
        isActive: true,
      },
    });
    categories += 1;

    const typeByCode = new Map();
    for (const definition of sheet.typeDefinitions) {
      const type = await prisma.letterType.upsert({
        where: { categoryId_typeCode: { categoryId: category.id, typeCode: definition.typeCode } },
        update: {
          typeName: definition.typeName,
          description: definition.description,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          typeCode: definition.typeCode,
          typeName: definition.typeName,
          description: definition.description,
          isActive: true,
        },
      });
      typeByCode.set(type.typeCode, type);
      parentTypeByCode.set(type.typeCode, { category, type });
      types += 1;
    }
    const validTypeCodes = new Set(typeByCode.keys());
    for (const existingType of await prisma.letterType.findMany({ where: { categoryId: category.id } })) {
      if (validTypeCodes.has(existingType.typeCode)) continue;
      const letterCount = await prisma.letter.count({ where: { letterTypeId: existingType.id } });
      if (letterCount === 0) {
        await prisma.letterType.update({
          where: { id: existingType.id },
          data: { isActive: false },
        });
      }
    }

    const parentTemplate = await ensureParentTemplates(category, sheet.typeDefinitions);
    templates += 1;

    for (const record of sheet.records) {
      const type = typeByCode.get(record.code);
      if (!type) continue;
      const existing = await prisma.letter.findFirst({
        where: {
          OR: [
            { letterNumber: record.letterNumber },
            { generatedLetterNumber: record.letterNumber },
          ],
        },
      });
      if (!existing) continue;

      const existingContent = existing.content && typeof existing.content === 'object' ? existing.content : {};
      await prisma.letter.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          letterTypeId: type.id,
          sequenceNumber: record.sequence,
          generatedLetterNumber: record.letterNumber,
          letterNumber: record.letterNumber,
          templateId: parentTemplate.id,
          content: {
            ...existingContent,
            subject: record.subject,
            perihal: record.subject,
            employee_name: record.employeeName,
            imported_from: path.basename(workbookPath),
            imported_sheet: sheet.sheetName,
          },
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
        },
      });
      letters += 1;

      const key = `${category.id}:${record.month}:${record.year}`;
      sequenceMax.set(key, {
        categoryId: category.id,
        month: record.month,
        year: record.year,
        currentNumber: Math.max(sequenceMax.get(key)?.currentNumber ?? 0, record.sequence),
      });
    }
  }

  const cleanup = await cleanupLegacyCategories(parentTypeByCode, parentCategoryCodes, sequenceMax);

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

  console.log(`Processed ${categories} parent categories.`);
  console.log(`Upserted ${types} letter types and ${templates} parent templates.`);
  console.log(`Updated ${letters} existing letters with letterTypeId, sequenceNumber, and parent category.`);
  console.log(`Moved ${cleanup.movedLetters} legacy category letters and deactivated ${cleanup.inactiveCategories} empty legacy categories.`);
  console.log(`Updated ${sequenceMax.size} parent category/month/year sequences.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
