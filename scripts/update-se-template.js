const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const docxPath = path.join(root, 'templates/docx/master/master-surat-edaran-se.docx');
const placeholders = [
  'letter_sequence',
  'letter_number',
  'letter_date',
  'perihal',
  'menindaklanjuti',
  'menimbang',
  'mengingat',
  'memutuskan',
];

const templateContent = [
  'SURAT EDARAN',
  'Nomor : {{letter_number}}',
  '',
  'TENTANG',
  '{{perihal}}',
  '',
  'Menindaklanjuti:',
  '{{menindaklanjuti}}',
  '',
  'MENIMBANG:',
  '{{menimbang}}',
  '',
  'MENGINGAT:',
  '{{mengingat}}',
  '',
  'MEMUTUSKAN:',
  '{{memutuskan}}',
  '',
  'Bandung, {{letter_date}}',
  '',
  'Ryan Nurochman',
  'Coor. Human Capital Management',
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

function replaceParagraphs(xml, replacements) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const updatedParagraphs = [];

  for (const paragraph of paragraphs) {
    const text = textOf(paragraph);
    const replacement = replacements.find((item) => item.match(text));
    if (!replacement) {
      updatedParagraphs.push(paragraph);
      continue;
    }

    if (replacement.remove) continue;
    updatedParagraphs.push(replaceParagraphText(paragraph, replacement.value));
  }

  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updatedParagraphs[index++] ?? '');
}

function updateDocx() {
  const zip = new PizZip(fs.readFileSync(docxPath));
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('word/document.xml not found in Surat Edaran template.');

  const replacements = [
    { match: (text) => text === 'KEBIJAKAN JADWAL KERJA HYBRID BAGI LEADERDI PT NEURONWORKS INDONESIA', value: '{{perihal}}' },
    { match: (text) => text.startsWith('Surat Edaran Nomor:'), remove: true },
    { match: (text) => text === 'Maka dengan ini disampaikan kebijakan terbaru sebagai berikut:', remove: true },
    {
      match: (text) =>
        text.startsWith('Bahwa dalam rangka menjaga keseimbangan') ||
        text.startsWith('Bahwa Leader memiliki peran strategis') ||
        text.startsWith('Bahwa untuk tetap menjaga produktivitas'),
      remove: true,
    },
    {
      match: (text) => text === 'MENIMBANG:',
      value: 'MENIMBANG:',
    },
    {
      match: (text) => text === 'MENGINGAT:',
      value: 'MENGINGAT:',
    },
    {
      match: (text) => text === 'MEMUTUSKAN:',
      value: 'MEMUTUSKAN:',
    },
    {
      match: (text) =>
        text.startsWith('Peraturan dan Kebijakan Internal') ||
        text.startsWith('Kewenangan manajemen') ||
        text.startsWith('Tanggung jawab bersama'),
      remove: true,
    },
    {
      match: (text) =>
        text.startsWith('Diberlakukan sistem kerja hybrid') ||
        text.startsWith('Jadwal kerja di kantor') ||
        text.startsWith('Anggota yang bekerja dari rumah') ||
        text.startsWith('Jika di kemudian hari') ||
        text.startsWith('Tidak fokus saat meeting') ||
        text.startsWith('Kurang responsif') ||
        text.startsWith('Dalam proses kerja') ||
        text.startsWith('Maka kebijakan ini dapat') ||
        text.startsWith('Anggota yang menjalankan') ||
        text.startsWith('Menggunakan koneksi internet') ||
        text.startsWith('Menggunakan VPN') ||
        text.startsWith('Memastikan semua perangkat') ||
        text.startsWith('Mengikuti seluruh pedoman') ||
        text.startsWith('Kebijakan ini berlaku mulai') ||
        text.startsWith('Wassalamu'),
      remove: true,
    },
    { match: (text) => text === 'Menindaklanjuti:', value: 'Menindaklanjuti:' },
    { match: (text) => /^Bandung,\s+/.test(text), value: 'Bandung, {{letter_date}}' },
  ];

  let xml = replaceParagraphs(document.asText(), replacements);
  xml = xml.replace(
    /(<w:p\b[\s\S]*?<w:t[^>]*>Menindaklanjuti:<\/w:t>[\s\S]*?<\/w:p>)/,
    `$1${paragraphLike(document.asText(), '{{menindaklanjuti}}')}`,
  );
  xml = xml.replace(
    /(<w:p\b[\s\S]*?<w:t[^>]*>MENIMBANG:<\/w:t>[\s\S]*?<\/w:p>)/,
    `$1${paragraphLike(document.asText(), '{{menimbang}}')}`,
  );
  xml = xml.replace(
    /(<w:p\b[\s\S]*?<w:t[^>]*>MENGINGAT:<\/w:t>[\s\S]*?<\/w:p>)/,
    `$1${paragraphLike(document.asText(), '{{mengingat}}')}`,
  );
  xml = xml.replace(
    /(<w:p\b[\s\S]*?<w:t[^>]*>MEMUTUSKAN:<\/w:t>[\s\S]*?<\/w:p>)/,
    `$1${paragraphLike(document.asText(), '{{memutuskan}}')}`,
  );

  zip.file('word/document.xml', xml);
  fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
}

function paragraphLike(xml, value) {
  const paragraph = xml.match(/<w:p\b[\s\S]*?<\/w:p>/)?.[0];
  if (!paragraph) return `<w:p><w:r><w:t>${encodeXml(value)}</w:t></w:r></w:p>`;
  return replaceParagraphText(paragraph, value);
}

async function updateDatabase() {
  const letterType = await prisma.letterType.findFirstOrThrow({
    where: { typeCode: 'SE', isActive: true },
    include: { category: true },
  });

  const template = await prisma.letterTemplate.findFirstOrThrow({
    where: {
      categoryId: letterType.categoryId,
      letterTypeId: letterType.id,
      docxTemplatePath: 'templates/docx/master/master-surat-edaran-se.docx',
    },
  });

  await prisma.letterTemplate.update({
    where: { id: template.id },
    data: {
      templateName: 'Surat Edaran',
      templateContent,
      placeholders,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  updateDocx();
  await updateDatabase();
  console.log('Updated Surat Edaran template with dynamic policy variables.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    void prisma.$disconnect();
  });
