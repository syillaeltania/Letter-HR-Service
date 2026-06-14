import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logoB64 = fs.readFileSync('/tmp/logo.b64', 'utf8').replace(/\n/g, '');
const isoLogoB64 = fs.readFileSync('/tmp/iso-logo.b64', 'utf8').replace(/\n/g, '');

const htmlWrapper = (content: string) => `
<table style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; border-collapse: collapse; border: none;">
  <thead style="display: table-header-group; border: none;">
    <tr>
      <td style="padding-bottom: 20px; border-bottom: 2px solid #2d7d32; padding-top: 20px; border-top: none; border-left: none; border-right: none;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 50%; vertical-align: bottom; border: none; padding: 0;">
              <img src="data:image/png;base64,${logoB64}" style="height: 52px;" alt="Neuronworks">
            </td>
            <td style="width: 50%; vertical-align: bottom; text-align: right; border: none; padding: 0;">
              <span style="font-size: 11pt;"><strong>{{letter_number}}</strong></span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </thead>
  <tbody style="border: none;">
    <tr>
      <td style="padding-top: 20px; padding-bottom: 20px; text-align: justify; vertical-align: top; border: none;">
${content}
      </td>
    </tr>
  </tbody>
  <tfoot style="display: table-footer-group; border: none;">
    <tr>
      <td style="padding-top: 20px; border-top: none; border-bottom: none; border-left: none; border-right: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; font-family: Arial, sans-serif; color: #333; border-top: 2px solid #2d7d32; padding-top: 10px; border-bottom: none; border-left: none; border-right: none;">
          <tr>
            <td style="width: 30%; vertical-align: top; border: none; padding: 0;">
              <strong>Certified By:</strong><br>
              <div style="margin-top: 5px;">
                <img src="data:image/png;base64,${isoLogoB64}" style="height: 35px; margin-right: 5px;">
              </div>
            </td>
            <td style="width: 70%; vertical-align: top; text-align: right; border: none; padding: 0;">
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

async function buildTemplate(filename: string, templateName: string, title: string, dateString: string, signatoriesTable: string) {
  const result = await mammoth.convertToHtml(
    { path: path.join(__dirname, 'templates/docx', filename) }
  );
  
  const rawHtml = result.value;
  
  const pasalMatch = rawHtml.match(/(<p><strong>Pasal 1[\s\S]*)/i);
  let pasalContent = pasalMatch ? pasalMatch[1] : '';
  
  pasalContent = pasalContent.replace(/<table>\s*<tr>\s*<td>\s*<p><strong>PIHAK PERTAMA[\s\S]*?<\/table>/i, `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 40px; border: none;">
  <tr>
    <td style="width: 40%; border: none;"><strong>PIHAK PERTAMA</strong></td>
    <td style="width: 20%; border: none;"></td>
    <td style="width: 40%; border: none;"><strong>PIHAK KEDUA</strong></td>
  </tr>
  <tr>
    <td style="height: 80px; border: none;"></td>
    <td style="border: none;"></td>
    <td style="border: none;"></td>
  </tr>
  <tr>
    <td style="border: none;"><strong>Sriyanto</strong><br><strong>{{signer_position}}</strong><br><strong>NIK. {{signer_nik}}</strong></td>
    <td style="border: none;"></td>
    <td style="border: none;"><strong>{{employee_name}}</strong></td>
  </tr>
</table>
  `);

  const body = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px; border: none;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px; border: none; padding: 0;">${title}</td>
    </tr>
    <tr>
      <td style="font-size: 11pt; border: none; padding-top: 10px;"><strong>Nomor : {{letter_number}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-bottom: 15px; text-align: justify;">${dateString}</div>

${signatoriesTable}

<div style="margin-bottom: 15px; margin-top: 15px;">Bahwa kedua belah pihak sepakat mengadakan perjanjian kerja sebagai berikut:</div>
${pasalContent}
  `.trim();

  // Also remove mammoth table borders if any leak through in the pasals
  let finalHtml = htmlWrapper(body);
  finalHtml = finalHtml.replace(/<table([^>]*)>/g, '<table$1 style="width: 100%; border-collapse: collapse; border: none;">');
  finalHtml = finalHtml.replace(/<td([^>]*)>/g, '<td$1 style="vertical-align: top; padding: 2px 0; border: none;">');

  await prisma.letterTemplate.updateMany({
    where: { templateName },
    data: { templateContent: finalHtml }
  });
  console.log('✅ Flawlessly Rebuilt', templateName);
}

const sigKaryawan = `
<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_name}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Jabatan</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_position}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">NIK</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_nik}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; margin-bottom: 15px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}</div>
<div style="margin-bottom: 15px; text-align: justify;">Dan selanjutnya disebut sebagai Pihak Pertama / Perusahaan (Pemberi Pekerjaan).</div>

<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>{{employee_name}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">No. KTP</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{employee_id_number}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Tempat / Tgl Lahir</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{employee_birth_place_date}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Alamat</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{employee_address}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; text-align: justify;">Dan selanjutnya disebut Pihak Kedua (Penerima Pekerjaan).</div>
`;

const sigMagang = `
<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>Ryan Nurochman</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Jabatan</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>Coordinator HCM</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">NIK</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>1931710098</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; margin-bottom: 15px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}</div>
<div style="margin-bottom: 15px; text-align: justify;">Dan selanjutnya disebut sebagai Pihak Pertama / Perusahaan (Pemberi Pekerjaan).</div>

<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>{{intern_name}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">No. KTP</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{intern_ktp}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Tempat / Tgl Lahir</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{intern_birth_place_date}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Alamat</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{intern_address}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; text-align: justify;">Dan selanjutnya disebut Pihak Kedua (Penerima Pekerjaan).</div>
`;

const sigFreelance = `
<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_name}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Jabatan</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_position}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">NIK</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{signer_nik}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; margin-bottom: 15px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}</div>
<div style="margin-bottom: 15px; text-align: justify;">Dan selanjutnya disebut sebagai Pihak Pertama / Perusahaan (Pemberi Pekerjaan).</div>

<table style="width: 100%; border-collapse: collapse; border: none;">
  <tbody>
    <tr>
      <td style="width: 25%; vertical-align: top; border: none; padding: 2px 0;">Nama</td>
      <td style="width: 5%; vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="width: 70%; vertical-align: top; border: none; padding: 2px 0;"><strong>{{freelance_name}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">No. KTP</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{freelance_ktp}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Tempat / Tgl Lahir</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{freelance_birth_place_date}}</strong></td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: none; padding: 2px 0;">Alamat</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;">:</td>
      <td style="vertical-align: top; border: none; padding: 2px 0;"><strong>{{freelance_address}}</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 15px; text-align: justify;">Dan selanjutnya disebut Pihak Kedua (Penerima Pekerjaan).</div>
`;

async function run() {
  await buildTemplate('kontrak-kerja-karyawan.docx', 'Template Kontrak Kerja Karyawan', 'K O N T R A K   K E R J A', 'Pada hari ini, <strong><em>{{letter_day}}</em></strong> tanggal <strong><em>{{letter_date_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigKaryawan);
  await buildTemplate('kontrak-kerja-freelancer.docx', 'Template Kontrak Kerja Freelancer', 'K O N T R A K   K E R J A   F R E E L A N C E', 'Pada hari ini, <strong><em>{{letter_day_name}}</em></strong> tanggal <strong><em>{{letter_day_text}}</em></strong> bulan <strong><em>{{letter_month_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigFreelance);
  await buildTemplate('kontrak-kerja-magang.docx', 'Template Kontrak Kerja Magang', 'K O N T R A K   K E R J A   M A G A N G', 'Pada hari ini, <strong><em>{{letter_day_name}}</em></strong> tanggal <strong><em>{{letter_day_text}}</em></strong> bulan <strong><em>{{letter_month_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigMagang);
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
