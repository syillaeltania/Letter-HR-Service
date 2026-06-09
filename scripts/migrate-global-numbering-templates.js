const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const GLOBAL_NUMBERING_PLACEHOLDERS = [
  'letter_sequence',
  'letter_number',
  'letter_category_code',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
];

function ensureTemplateContentNumber(templateContent) {
  if (templateContent.includes('{{letter_number}}')) return templateContent;
  const lines = templateContent.split('\n');
  const [title = 'Template', ...rest] = lines;
  return [title, 'Nomor: {{letter_number}}', ...rest].join('\n');
}

function replaceHardcodedNumbers(xml) {
  const directUpdatedXml = xml
    .replace(/NW-\d{1,4}\/[A-Z0-9.-]+\/HCM\/[IVXLCDM]+\/\d{4}/g, '{{letter_number}}')
    .replace(/\d{1,4}\/M_NW\/[A-Z0-9.-]+\/[IVXLCDM]+[-/]\d{4}/g, '{{letter_number}}')
    .replace(/\d{1,4}\/[A-Z0-9.-]+\/HCM\/[IVXLCDM]+\/\d{4}/g, '{{letter_number}}');

  return directUpdatedXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const paragraphText = getParagraphText(paragraph);
    if (!/^(Reg\s*No|Nomor|No\.?|Nomor\s+Surat)\s*[:：]/i.test(paragraphText)) return paragraph;
    if (!containsHardcodedLetterNumber(paragraphText)) return paragraph;
    return replaceTextAcrossTextNodes(paragraph, letterNumberRegex(), '{{letter_number}}');
  });
}

function letterNumberRegex() {
  return /(?:NW-)?\d{1,4}\/(?:M_NW\/)?[A-Z0-9.-]+\/(?:HCM\/)?[IVXLCDM]+[-/]\d{4}/;
}

function containsHardcodedLetterNumber(value) {
  return letterNumberRegex().test(value);
}

function getParagraphText(paragraph) {
  return getTextNodes(paragraph)
    .map((node) => node.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTextNodes(xml) {
  const nodes = [];
  const regex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml))) {
    nodes.push({
      start: match.index,
      end: regex.lastIndex,
      openTag: match[0].slice(0, match[0].indexOf('>') + 1),
      text: decodeXml(match[1]),
    });
  }
  return nodes;
}

function replaceTextAcrossTextNodes(xml, pattern, replacement) {
  const nodes = getTextNodes(xml);
  const fullText = nodes.map((node) => node.text).join('');
  const match = fullText.match(pattern);
  if (!match || match.index === undefined) return xml;

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  let cursor = 0;
  let inserted = false;
  const updatedNodes = nodes.map((node) => {
    const nodeStart = cursor;
    const nodeEnd = cursor + node.text.length;
    cursor = nodeEnd;

    if (nodeEnd <= matchStart || nodeStart >= matchEnd) return node;

    const before = node.text.slice(0, Math.max(0, matchStart - nodeStart));
    const after = node.text.slice(Math.max(0, matchEnd - nodeStart));
    const text = `${before}${inserted ? '' : replacement}${after}`;
    inserted = true;
    return { ...node, text };
  });

  let output = '';
  let lastIndex = 0;
  for (const node of updatedNodes) {
    output += xml.slice(lastIndex, node.start);
    output += `${node.openTag}${encodeXml(node.text)}</w:t>`;
    lastIndex = node.end;
  }
  return `${output}${xml.slice(lastIndex)}`;
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function encodeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function migrateDocxTemplate(docxTemplatePath) {
  if (!docxTemplatePath) return false;
  const absolutePath = path.resolve(root, docxTemplatePath);
  if (!fs.existsSync(absolutePath)) return false;

  const zip = new PizZip(fs.readFileSync(absolutePath));
  const xmlFiles = Object.keys(zip.files).filter((fileName) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(fileName),
  );
  let changed = false;

  for (const fileName of xmlFiles) {
    const file = zip.file(fileName);
    if (!file) continue;
    const xml = file.asText();
    const updatedXml = replaceHardcodedNumbers(xml);
    if (updatedXml !== xml) {
      zip.file(fileName, updatedXml);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(absolutePath, zip.generate({ type: 'nodebuffer' }));
  }
  return changed;
}

async function main() {
  const templates = await prisma.letterTemplate.findMany();
  let updatedTemplates = 0;
  let updatedDocx = 0;

  for (const template of templates) {
    const placeholders = [...new Set([...GLOBAL_NUMBERING_PLACEHOLDERS, ...template.placeholders])];
    const templateContent = ensureTemplateContentNumber(template.templateContent);
    const docxChanged = migrateDocxTemplate(template.docxTemplatePath);

    await prisma.letterTemplate.update({
      where: { id: template.id },
      data: {
        placeholders,
        templateContent,
      },
    });

    updatedTemplates += 1;
    if (docxChanged) updatedDocx += 1;
  }

  for (const docxPath of findDocxFiles(path.resolve(root, 'templates', 'docx'))) {
    const relativePath = path.relative(root, docxPath);
    if (migrateDocxTemplate(relativePath)) updatedDocx += 1;
  }

  console.log(`Updated ${updatedTemplates} templates with global numbering variables.`);
  console.log(`Updated ${updatedDocx} DOCX template files with placeholder number replacements.`);
}

function findDocxFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const item of fs.readdirSync(directory)) {
    const itemPath = path.join(directory, item);
    if (fs.statSync(itemPath).isDirectory()) {
      files.push(...findDocxFiles(itemPath));
    } else if (itemPath.endsWith('.docx')) {
      files.push(itemPath);
    }
  }
  return files;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
