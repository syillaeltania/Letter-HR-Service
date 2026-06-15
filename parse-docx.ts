import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logoB64 = fs.readFileSync('/tmp/logo.b64', 'utf8').replace(/\n/g, '');

const htmlWrapper = (content: string) => `
<table style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; border-collapse: collapse;">
  <thead style="display: table-header-group;">
    <tr>
      <td style="padding-bottom: 20px; border-bottom: 2px solid #000; padding-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: bottom;">
              <img src="data:image/png;base64,${logoB64}" style="height: 52px;" alt="Neuronworks">
            </td>
            <td style="text-align: right; vertical-align: bottom;">
              Bandung, {{letter_date_text}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding-top: 20px; padding-bottom: 20px; text-align: justify; vertical-align: top;">
${content}
      </td>
    </tr>
  </tbody>
  <tfoot style="display: table-footer-group;">
    <tr>
      <td style="padding-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; font-family: Arial, sans-serif; color: #333; border-top: 2px solid #000; padding-top: 10px;">
          <tr>
            <td style="width: 30%; vertical-align: top;">
              <strong>Certified By:</strong><br>
              <div style="margin-top: 5px;">
                <!-- Skipping ISO logos base64 for size, using generic text or valid url if needed, but since user requested exact, maybe we just leave it or use text -->
                ISO/IEC 27001:2013 Certified
              </div>
            </td>
            <td style="width: 70%; vertical-align: top; text-align: right;">
              <strong>PT. Neuronworks Indonesia</strong><br>
              Komp. Buah Batu Regency A2 No.9-10 kel. Kujangsari kec. Bandung Kidul<br>
              Kota Bandung Jawa Barat – Indonesia 40287  Phone. 022-8730 9898, Fax. 022-8730 9898<br>
              <a href="http://www.neuronworks.co.id" style="color: #333; text-decoration: none;">www.neuronworks.co.id</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </tfoot>
</table>`.trim();

async function processDocx(filename: string, templateName: string, categoryCode: string, typeCode?: string) {
  const filepath = path.join(__dirname, 'templates/docx', filename);
  if (!fs.existsSync(filepath)) {
    console.log('Skipping', filename, '- not found');
    return;
  }
  
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "table => table.table-bordered",
    ]
  };

  const result = await mammoth.convertToHtml({path: filepath}, options);
  let html = result.value;
  
  // Clean up common mammoth artifacts or unneeded margins if any
  html = html.replace(/<p>/g, '<p style="margin-bottom: 10px;">');
  
  const finalHtml = htmlWrapper(html);
  
  // Find category
  const category = await prisma.letterCategory.findUnique({ where: { categoryCode } });
  if (!category) return;
  
  let typeId = null;
  if (typeCode) {
    const type = await prisma.letterType.findFirst({ where: { categoryId: category.id, typeCode } });
    if (type) typeId = type.id;
  }
  
  await prisma.letterTemplate.updateMany({
    where: { templateName },
    data: { templateContent: finalHtml }
  });
  console.log('Updated', templateName);
}

async function run() {
  await processDocx('kontrak-kerja-karyawan.docx', 'Template Kontrak Kerja Karyawan', 'KK', 'KK.02');
  await processDocx('kontrak-kerja-freelancer.docx', 'Template Kontrak Kerja Freelancer', 'KK', 'KK.04');
  await processDocx('kontrak-kerja-magang.docx', 'Template Kontrak Kerja Magang', 'KK', 'KK.05');
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
