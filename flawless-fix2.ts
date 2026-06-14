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
              <span style="font-size: 11pt;"><strong>{{letter_number}}</strong></span>
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

async function buildTemplate(filename: string, templateName: string, title: string, dateString: string, signatoriesTable: string) {
  const result = await mammoth.convertToHtml(
    { path: path.join(__dirname, 'templates/docx', filename) }
  );
  
  const rawHtml = result.value;
  
  // Extract Pasals
  const pasalMatch = rawHtml.match(/(<p><strong>Pasal 1[\s\S]*)/i);
  let pasalContent = pasalMatch ? pasalMatch[1] : '';
  
  // Clean Mammoth output in Pasals (replace tables correctly)
  // ONLY replace tables that do not already have a style attribute
  pasalContent = pasalContent.replace(/<table>/gi, '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">');
  pasalContent = pasalContent.replace(/<td>/gi, '<td style="vertical-align: top; padding: 5px; border: 1px solid #e5e7eb;">');

  // Replace signature block at the end of pasals
  pasalContent = pasalContent.replace(/<table[^>]*>\s*<tr>\s*<td[^>]*>\s*<p><strong>PIHAK PERTAMA[\s\S]*?<\/table>/i, `
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

  const body = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px;">${title}</td>
    </tr>
    <tr>
      <td style="font-size: 11pt; padding-top: 5px;"><strong>Nomor : {{letter_number}}</strong></td>
    </tr>
  </tbody>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr>
      <td style="padding-bottom: 10px; text-align: justify;">${dateString}</td>
    </tr>
  </tbody>
</table>

${signatoriesTable}

<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 15px;">
  <tbody>
    <tr>
      <td style="text-align: justify;">Bahwa kedua belah pihak sepakat mengadakan perjanjian kerja sebagai berikut:</td>
    </tr>
  </tbody>
</table>

${pasalContent}
  `.trim();

  const finalHtml = htmlWrapper(body);

  await prisma.letterTemplate.updateMany({
    where: { templateName },
    data: { templateContent: finalHtml }
  });
  console.log('✅ Flawlessly Rebuilt', templateName);
}

const sigKaryawan = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 5%; vertical-align: top;">1.</td><td style="width: 25%; vertical-align: top;">Nama</td><td style="width: 5%; vertical-align: top;">:</td><td style="width: 65%; vertical-align: top;"><strong>{{signer_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">Jabatan</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_position}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">NIK</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_nik}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 10px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama <strong>{{company_name}}</strong> yang beralamat di {{company_address}}, selanjutnya disebut <strong>Pihak Pertama / Perusahaan</strong>.</td></tr>
    <tr><td style="vertical-align: top;">2.</td><td style="vertical-align: top;">Nama</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{employee_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">No. KTP</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_id_number}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Tempat / Tgl Lahir</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_birth_place_date}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Alamat</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_address}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 15px; text-align: justify;">Selanjutnya disebut <strong>Pihak Kedua</strong>.</td></tr>
  </tbody>
</table>
`;

const sigMagang = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 25%; vertical-align: top;">Nama</td><td style="width: 5%; vertical-align: top;">:</td><td style="width: 70%; vertical-align: top;"><strong>Ryan Nurochman</strong></td></tr>
    <tr><td style="vertical-align: top;">Jabatan</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>Coordinator HCM</strong></td></tr>
    <tr><td style="vertical-align: top;">NIK</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>1931710098</strong></td></tr>
    <tr><td colspan="3" style="padding-top: 10px; padding-bottom: 10px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}<br><br>Dan selanjutnya disebut sebagai Pihak Pertama / Perusahaan (Pemberi Pekerjaan).</td></tr>
    
    <tr><td style="vertical-align: top;">Nama</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{intern_name}}</strong></td></tr>
    <tr><td style="vertical-align: top;">No. KTP</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{intern_ktp}}</strong></td></tr>
    <tr><td style="vertical-align: top;">Tempat / Tgl Lahir</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{intern_birth_place_date}}</strong></td></tr>
    <tr><td style="vertical-align: top;">Alamat</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{intern_address}}</strong></td></tr>
    <tr><td colspan="3" style="padding-top: 10px; padding-bottom: 15px; text-align: justify;">Dan selanjutnya disebut Pihak Kedua (Penerima Pekerjaan).</td></tr>
  </tbody>
</table>
`;

const sigFreelance = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 25%; vertical-align: top;">Nama</td><td style="width: 5%; vertical-align: top;">:</td><td style="width: 70%; vertical-align: top;"><strong>{{signer_name}}</strong></td></tr>
    <tr><td style="vertical-align: top;">Jabatan</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{signer_position}}</strong></td></tr>
    <tr><td style="vertical-align: top;">NIK</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{signer_nik}}</strong></td></tr>
    <tr><td colspan="3" style="padding-top: 10px; padding-bottom: 10px; text-align: justify;">Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}<br><br>Dan selanjutnya disebut sebagai Pihak Pertama / Perusahaan (Pemberi Pekerjaan).</td></tr>
    
    <tr><td style="vertical-align: top;">Nama</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{freelance_name}}</strong></td></tr>
    <tr><td style="vertical-align: top;">No. KTP</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{freelance_ktp}}</strong></td></tr>
    <tr><td style="vertical-align: top;">Tempat / Tgl Lahir</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{freelance_birth_place_date}}</strong></td></tr>
    <tr><td style="vertical-align: top;">Alamat</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{freelance_address}}</strong></td></tr>
    <tr><td colspan="3" style="padding-top: 10px; padding-bottom: 15px; text-align: justify;">Dan selanjutnya disebut Pihak Kedua (Penerima Pekerjaan).</td></tr>
  </tbody>
</table>
`;

async function run() {
  // Use the exact wording for date based on user's docx!
  await buildTemplate('kontrak-kerja-karyawan.docx', 'Template Kontrak Kerja Karyawan', 'K O N T R A K   K E R J A', 'Pada hari ini, <strong><em>{{letter_day}}</em></strong> tanggal <strong><em>{{letter_date_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigKaryawan);
  await buildTemplate('kontrak-kerja-freelancer.docx', 'Template Kontrak Kerja Freelancer', 'K O N T R A K   K E R J A   F R E E L A N C E', 'Pada hari ini, <strong><em>{{letter_day_name}}</em></strong> tanggal <strong><em>{{letter_day_text}}</em></strong> bulan <strong><em>{{letter_month_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigFreelance);
  await buildTemplate('kontrak-kerja-magang.docx', 'Template Kontrak Kerja Magang', 'K O N T R A K   K E R J A   M A G A N G', 'Pada hari ini, <strong><em>{{letter_day_name}}</em></strong> tanggal <strong><em>{{letter_day_text}}</em></strong> bulan <strong><em>{{letter_month_text}}</em></strong> tahun <strong><em>{{letter_year_text}}</em></strong>, kami yang bertanda tangan di bawah ini :', sigMagang);
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
