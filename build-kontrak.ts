import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logoB64 = fs.readFileSync('/tmp/logo.b64', 'utf8').replace(/\n/g, '');
const isoLogoB64 = fs.readFileSync('/tmp/iso-logo.b64', 'utf8').replace(/\n/g, '');

const htmlWrapper = (content: string) => `
<table style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; border-collapse: collapse;">
  <thead style="display: table-header-group;">
    <tr>
      <td style="padding-bottom: 20px; border-bottom: 2px solid #2d7d32; padding-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: bottom;">
              <img src="data:image/png;base64,${logoB64}" style="height: 52px;" alt="Neuronworks">
            </td>
            <td style="width: 50%; vertical-align: bottom; text-align: right;">
              <span style="font-size: 11pt;">{{letter_number}}</span>
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
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; font-family: Arial, sans-serif; color: #333; border-top: 2px solid #2d7d32; padding-top: 10px;">
          <tr>
            <td style="width: 30%; vertical-align: top;">
              <strong>Certified By:</strong><br>
              <div style="margin-top: 5px;">
                <img src="data:image/png;base64,${isoLogoB64}" style="height: 35px; margin-right: 5px;">
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

function processSignatories(html: string) {
  // Replace the messy mammoth output with clean tables for signatories!
  
  // First, find the title block: <h1>K O N T R A K   K E R J A</h1>
  html = html.replace(/<h1>([\s\S]*?)<\/h1>/gi, '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px; text-align: center;">$1</td></tr></table>');
  
  // Replace "Nomor : {{letter_number}}"
  html = html.replace(/<p>Nomor\s*:\s*\{\{letter_number\}\}<\/p>/gi, '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 11pt; text-align: center;">Nomor : {{letter_number}}</td></tr></table>');

  // We know the pattern for Pihak Pertama and Kedua in Kontrak Kerja files:
  const sigRegex = /<p>Nama\s*:\s*\{\{signer_name\}\}<\/p>\s*<p>Jabatan\s*:\s*\{\{signer_position\}\}<\/p>\s*<p>NIK\s*:\s*\{\{signer_nik\}\}<\/p>[\s\S]*?\{\{company_name\}\}[\s\S]*?Pihak Pertama[\s\S]*?<p>Nama\s*:\s*\{\{employee_name\}\}[\s\S]*?Pihak Kedua/i;
  
  if (sigRegex.test(html)) {
    const tableHtml = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 5%; vertical-align: top;">1.</td><td style="width: 25%; vertical-align: top;">Nama</td><td style="width: 5%; vertical-align: top;">:</td><td style="width: 65%; vertical-align: top;"><strong>{{signer_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">Jabatan</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_position}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">NIK</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_nik}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 10px;">Dalam hal ini bertindak untuk dan atas nama <strong>{{company_name}}</strong> yang beralamat di {{company_address}}, selanjutnya disebut <strong>Pihak Pertama / Perusahaan</strong>.</td></tr>
    <tr><td style="vertical-align: top;">2.</td><td style="vertical-align: top;">Nama</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{employee_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">No. KTP</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_id_number}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Tempat / Tgl Lahir</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_birth_place_date}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Alamat</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_address}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 15px;">Selanjutnya disebut <strong>Pihak Kedua</strong>.</td></tr>
  </tbody>
</table>
`;
    // Replace the entire block from the first "Nama : {{signer_name}}" down to "Pihak Kedua (Penerima Pekerjaan)."
    html = html.replace(/<p>Nama\s*:\s*\{\{signer_name\}\}<\/p>[\s\S]*?Pihak Kedua\s*\(Penerima Pekerjaan\)\.<\/p>/i, tableHtml);
  }

  // Replace final signatures table (which mammoth exports as a standard HTML table without styling)
  html = html.replace(/<table>\s*<tr>\s*<td>\s*<p><strong>PIHAK PERTAMA[\s\S]*?<\/table>/i, `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 40px;">
  <tr>
    <td style="width: 40%;"><strong>PIHAK PERTAMA</strong></td>
    <td style="width: 20%;"></td>
    <td style="width: 40%;"><strong>PIHAK KEDUA</strong></td>
  </tr>
  <tr>
    <td style="height: 80px;"></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td><strong>Sriyanto</strong><br><strong>{{signer_position}}</strong><br><strong>NIK. {{signer_nik}}</strong></td>
    <td></td>
    <td><strong>{{employee_name}}</strong></td>
  </tr>
</table>
  `);

  return html;
}

async function run() {
  const files = [
    { file: 'kontrak-kerja-karyawan.docx', name: 'Template Kontrak Kerja Karyawan' },
    { file: 'kontrak-kerja-freelancer.docx', name: 'Template Kontrak Kerja Freelancer' },
    { file: 'kontrak-kerja-magang.docx', name: 'Template Kontrak Kerja Magang' }
  ];

  for (const f of files) {
    const result = await mammoth.convertToHtml(
      { path: path.join(__dirname, 'templates/docx', f.file) },
      { styleMap: ["p[style-name='Heading 1'] => h1:fresh"] }
    );
    
    let html = result.value;
    html = processSignatories(html);
    html = htmlWrapper(html);
    
    await prisma.letterTemplate.updateMany({
      where: { templateName: f.name },
      data: { templateContent: html }
    });
    console.log('✅ Re-built Table Layout for', f.name);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
