const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const pairs = [
  [
    '/Users/syilla/Downloads/006_KK_Achmad Hendarsyah.docx',
    'templates/docx/kontrak-kerja-karyawan.docx',
  ],
  [
    '/Users/syilla/Downloads/KKM - 009 - Fakhriy Dzakwan.docx',
    'templates/docx/kontrak-kerja-magang.docx',
  ],
  [
    '/Users/syilla/Downloads/052_KK_Dedi.docx',
    'templates/docx/kontrak-kerja-freelancer.docx',
  ],
  [
    '/Users/syilla/Downloads/Offering Letter - Achmad Hendarsyah copy.docx',
    'templates/docx/offering-letter.docx',
  ],
];

const xmlPart = (zip, file) => zip.file(file)?.asText() ?? '';
const list = (zip, prefix) => Object.keys(zip.files).filter((name) => name.startsWith(prefix)).sort();
const listComparableMedia = (zip) =>
  list(zip, 'word/media/').filter((name) => !/^word\/media\/footer-/.test(name));
const extractTag = (xml, tag) => xml.match(new RegExp(`<${tag}[^>]*>`, 's'))?.[0] ?? '';
const normalize = (value) => value.replace(/\s+/g, ' ').trim();

let failed = false;

for (const [source, generated] of pairs) {
  const sourceZip = new PizZip(fs.readFileSync(source));
  const generatedZip = new PizZip(fs.readFileSync(generated));
  const sourceDoc = xmlPart(sourceZip, 'word/document.xml');
  const generatedDoc = xmlPart(generatedZip, 'word/document.xml');

  const checks = [
    ['page size', extractTag(sourceDoc, 'w:pgSz') === extractTag(generatedDoc, 'w:pgSz')],
    ['page margin', extractTag(sourceDoc, 'w:pgMar') === extractTag(generatedDoc, 'w:pgMar')],
    ['columns', extractTag(sourceDoc, 'w:cols') === extractTag(generatedDoc, 'w:cols')],
    [
      'headers',
      normalize(list(sourceZip, 'word/header').join(',')) ===
        normalize(list(generatedZip, 'word/header').join(',')),
    ],
    [
      'footers',
      normalize(list(sourceZip, 'word/footer').join(',')) ===
        normalize(list(generatedZip, 'word/footer').join(',')),
    ],
    [
      'media/logo files',
      normalize(listComparableMedia(sourceZip).join(',')) ===
        normalize(listComparableMedia(generatedZip).join(',')),
    ],
  ];

  console.log(`\n${path.basename(generated)}`);
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'OK ' : 'ERR'} ${name}`);
    if (!ok) failed = true;
  }
}

process.exit(failed ? 1 : 0);
