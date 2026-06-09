const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const root = path.resolve(__dirname, '..');
const templateDir = path.join(root, 'templates', 'docx');
const referenceDocxPath =
  process.env.HEADER_FOOTER_REFERENCE_DOCX || path.join(templateDir, 'kontrak-kerja-karyawan.docx');

function listFiles(zip, pattern) {
  return Object.keys(zip.files).filter((name) => pattern.test(name)).sort();
}

function normalizeXmlLineEndings(xml) {
  return xml.replace(/\r\n/g, '\n');
}

function rewriteRelationshipTargets(relsXml, sourceZip, mediaCopies, mediaPrefix) {
  return relsXml.replace(
    /<Relationship\b([^>]*?)\bTarget="([^"]+)"([^>]*?)\/>/g,
    (relationship, beforeTarget, target, afterTarget) => {
      const isImageRelationship = relationship.includes(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      );

      if (!isImageRelationship || !target.startsWith('media/')) {
        return relationship;
      }

      const sourceMediaPath = `word/${target}`;
      const targetMediaPath = `word/media/${mediaPrefix}-${path.basename(target)}`;
      const sourceMedia = sourceZip.file(sourceMediaPath);
      if (!sourceMedia) {
        throw new Error(`Missing referenced media in standard template: ${sourceMediaPath}`);
      }

      mediaCopies.set(targetMediaPath, sourceMedia.asNodeBuffer());
      return `<Relationship${beforeTarget}Target="${targetMediaPath.replace('word/', '')}"${afterTarget}/>`;
    },
  );
}

function readStandardParts() {
  if (!fs.existsSync(referenceDocxPath)) {
    throw new Error(`Standard header/footer reference DOCX not found: ${referenceDocxPath}`);
  }

  const zip = new PizZip(fs.readFileSync(referenceDocxPath));
  const headerPath = listFiles(zip, /^word\/header\d+\.xml$/)[0];
  const footerPath = listFiles(zip, /^word\/footer\d+\.xml$/)[0];
  if (!headerPath || !footerPath) {
    throw new Error(`Reference DOCX must contain at least one header and footer: ${referenceDocxPath}`);
  }

  const headerRelsPath = `word/_rels/${path.basename(headerPath)}.rels`;
  const footerRelsPath = `word/_rels/${path.basename(footerPath)}.rels`;
  const mediaCopies = new Map();
  const documentXml = zip.file('word/document.xml')?.asText() ?? '';
  const pgMar = documentXml.match(/<w:pgMar\b[^>]*\/>/)?.[0];

  return {
    headerXml: normalizeXmlLineEndings(zip.file(headerPath).asText()),
    footerXml: normalizeXmlLineEndings(zip.file(footerPath).asText()),
    headerRelsXml: zip.file(headerRelsPath)
      ? rewriteRelationshipTargets(zip.file(headerRelsPath).asText(), zip, mediaCopies, 'standard-header')
      : null,
    footerRelsXml: zip.file(footerRelsPath)
      ? rewriteRelationshipTargets(zip.file(footerRelsPath).asText(), zip, mediaCopies, 'standard-footer')
      : null,
    mediaCopies,
    pgMar,
  };
}

function allTemplateDocxFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return allTemplateDocxFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.docx') ? [entryPath] : [];
  });
}

function removeOldStandardMedia(zip) {
  for (const fileName of Object.keys(zip.files)) {
    if (/^word\/media\/standard-(?:header|footer)-/.test(fileName)) {
      zip.remove(fileName);
    }
  }
}

function ensureStandardRelationships(zip, standard, partType) {
  const partFiles = listFiles(zip, new RegExp(`^word/${partType}\\d+\\.xml$`));
  const standardXml = partType === 'header' ? standard.headerXml : standard.footerXml;
  const standardRelsXml = partType === 'header' ? standard.headerRelsXml : standard.footerRelsXml;

  for (const partPath of partFiles) {
    zip.file(partPath, standardXml);
    const relsPath = `word/_rels/${path.basename(partPath)}.rels`;
    if (standardRelsXml) {
      zip.file(relsPath, standardRelsXml);
    }
  }
}

function standardizePageMargins(zip, standard) {
  if (!standard.pgMar) return;

  const document = zip.file('word/document.xml');
  const xml = document?.asText();
  if (!xml) return;

  const updatedXml = /<w:pgMar\b[^>]*\/>/.test(xml)
    ? xml.replace(/<w:pgMar\b[^>]*\/>/g, standard.pgMar)
    : xml;

  if (updatedXml !== xml) {
    zip.file('word/document.xml', updatedXml);
  }
}

function standardizeDocx(filePath, standard) {
  const zip = new PizZip(fs.readFileSync(filePath));
  const hasHeader = listFiles(zip, /^word\/header\d+\.xml$/).length > 0;
  const hasFooter = listFiles(zip, /^word\/footer\d+\.xml$/).length > 0;
  if (!hasHeader && !hasFooter) return false;

  removeOldStandardMedia(zip);
  for (const [mediaPath, buffer] of standard.mediaCopies.entries()) {
    zip.file(mediaPath, buffer);
  }

  if (hasHeader) ensureStandardRelationships(zip, standard, 'header');
  if (hasFooter) ensureStandardRelationships(zip, standard, 'footer');
  standardizePageMargins(zip, standard);

  fs.writeFileSync(filePath, zip.generate({ type: 'nodebuffer' }));
  return true;
}

const standard = readStandardParts();
const files = allTemplateDocxFiles(templateDir).filter((filePath) => path.resolve(filePath) !== path.resolve(referenceDocxPath));

for (const filePath of files) {
  if (standardizeDocx(filePath, standard)) {
    console.log(`Standardized header/footer ${path.relative(root, filePath)}`);
  }
}

