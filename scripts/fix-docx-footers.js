const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const templateDir = path.resolve(__dirname, '..', 'templates', 'docx');
const referenceDocxPath =
  process.env.FOOTER_REFERENCE_DOCX || '/Users/syilla/Downloads/006_KK_Achmad Hendarsyah.docx';

function assertReferenceExists() {
  if (!fs.existsSync(referenceDocxPath)) {
    throw new Error(`Footer reference DOCX not found: ${referenceDocxPath}`);
  }
}

function listFiles(zip, pattern) {
  return Object.keys(zip.files).filter((name) => pattern.test(name)).sort();
}

function rewriteFooterRelationshipTargets(relsXml, mediaCopies) {
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
      const targetMediaPath = `word/media/footer-reference-${path.basename(target)}`;
      mediaCopies.set(sourceMediaPath, targetMediaPath);

      return `<Relationship${beforeTarget}Target="${targetMediaPath.replace('word/', '')}"${afterTarget}/>`;
    },
  );
}

function loadReferenceFooter() {
  const referenceZip = new PizZip(fs.readFileSync(referenceDocxPath));
  const footerFiles = listFiles(referenceZip, /^word\/footer\d+\.xml$/);
  const footerRelsFiles = listFiles(referenceZip, /^word\/_rels\/footer\d+\.xml\.rels$/);
  const mediaCopies = new Map();

  if (footerFiles.length === 0) {
    throw new Error(`No footer XML found in reference DOCX: ${referenceDocxPath}`);
  }

  const footers = new Map(
    footerFiles.map((footerPath) => [path.basename(footerPath), referenceZip.file(footerPath).asText()]),
  );

  const footerRelationships = new Map(
    footerRelsFiles.map((relsPath) => [
      path.basename(relsPath).replace('.rels', ''),
      rewriteFooterRelationshipTargets(referenceZip.file(relsPath).asText(), mediaCopies),
    ]),
  );

  const media = new Map(
    [...mediaCopies.entries()].map(([sourceMediaPath, targetMediaPath]) => [
      targetMediaPath,
      referenceZip.file(sourceMediaPath).asNodeBuffer(),
    ]),
  );

  return { footers, footerRelationships, media };
}

function removeGeneratedFooterMedia(zip) {
  for (const fileName of Object.keys(zip.files)) {
    if (/^word\/media\/footer-(?:reference-)?/.test(fileName)) {
      zip.remove(fileName);
    }
  }
}

function applyReferenceFooter(zip, referenceFooter) {
  const targetFooterFiles = listFiles(zip, /^word\/footer\d+\.xml$/);
  const fallbackFooterName = [...referenceFooter.footers.keys()][0];
  const fallbackFooterXml = referenceFooter.footers.get(fallbackFooterName);
  const fallbackRelsXml =
    referenceFooter.footerRelationships.get(fallbackFooterName) ||
    [...referenceFooter.footerRelationships.values()][0];

  removeGeneratedFooterMedia(zip);

  for (const [mediaPath, buffer] of referenceFooter.media.entries()) {
    zip.file(mediaPath, buffer);
  }

  for (const footerPath of targetFooterFiles) {
    const footerName = path.basename(footerPath);
    zip.file(footerPath, referenceFooter.footers.get(footerName) || fallbackFooterXml);

    const relsPath = `word/_rels/${footerName}.rels`;
    if (fallbackRelsXml) {
      zip.file(relsPath, referenceFooter.footerRelationships.get(footerName) || fallbackRelsXml);
    }
  }
}

assertReferenceExists();
const referenceFooter = loadReferenceFooter();

for (const file of fs.readdirSync(templateDir).filter((name) => name.endsWith('.docx'))) {
  const filePath = path.join(templateDir, file);
  const zip = new PizZip(fs.readFileSync(filePath));

  applyReferenceFooter(zip, referenceFooter);

  fs.writeFileSync(filePath, zip.generate({ type: 'nodebuffer' }));
  console.log(`Fixed footer ${path.relative(process.cwd(), filePath)}`);
}
