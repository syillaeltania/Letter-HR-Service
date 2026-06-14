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
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/ISO_27001_Information_Security_Management_System_Logo.png/120px-ISO_27001_Information_Security_Management_System_Logo.png" style="height: 35px; margin-right: 5px;">
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

async function processDocx(filepath: string) {
  const filename = path.basename(filepath);
  if (!filename.endsWith('.docx') || filename.startsWith('~')) return;
  
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='List Paragraph'] => li:fresh",
      "table => table.table-bordered",
    ]
  };

  const result = await mammoth.convertToHtml({path: filepath}, options);
  let html = result.value;
  
  // Clean up common mammoth artifacts
  html = html.replace(/<p>/g, '<p style="margin-bottom: 10px;">');
  
  const finalHtml = htmlWrapper(html);
  
  // Fuzzy match template name in DB
  // Extract key terms from filename
  let searchTerm = filename.replace('.docx', '').replace('master-', '').replace(/-/g, ' ').toLowerCase();
  
  // Some manual overrides
  let query = '';
  if (searchTerm.includes('offering letter')) query = 'Offering Letter';
  else if (searchTerm.includes('karyawan') && !searchTerm.includes('bekerja') && !searchTerm.includes('kontrak')) query = 'Kontrak Kerja Karyawan';
  else if (searchTerm.includes('freelancer')) query = 'Kontrak Kerja Freelancer';
  else if (searchTerm.includes('magang') && !searchTerm.includes('bekerja')) query = 'Kontrak Kerja Magang';
  else if (searchTerm.includes('bast resource')) query = 'BAST Resource';
  else if (searchTerm.includes('demosi')) query = 'Demosi';
  else if (searchTerm.includes('kenaikan golongan')) query = 'Kenaikan Golongan';
  else if (searchTerm.includes('asesmen junior programmer')) query = 'Asesmen Junior Programmer';
  else if (searchTerm.includes('asesmen kebutuhan')) query = 'Asesmen Kebutuhan';
  else if (searchTerm.includes('mutasi')) query = 'Mutasi';
  else if (searchTerm.includes('peg tetap')) query = 'Peg Tetap';
  else if (searchTerm.includes('lokasi kerja')) query = 'Lokasi Kerja';
  else if (searchTerm.includes('reposisi')) query = 'Reposisi';
  else if (searchTerm.includes('evaluasi kontrak')) query = 'Evaluasi Kontrak';
  else if (searchTerm.includes('edaran')) query = 'Surat Edaran';
  else if (searchTerm.includes('bekerja (karyawan)')) query = 'SKB.01';
  else if (searchTerm.includes('bekerja (magang)')) query = 'SKB.02';
  else if (searchTerm.includes('anggota baru')) query = 'Anggota Baru';
  else if (searchTerm.includes('komitmen (kenaikan jabatan)')) query = 'Komitmen (Kenaikan Jabatan)';
  else if (searchTerm.includes('hcm dan user')) query = 'HCM dan User';
  else if (searchTerm.includes('psikotes')) query = 'Psikotes';
  else if (searchTerm.includes('skill test')) query = 'Skill Test';
  else if (searchTerm.includes('approval kpi')) query = 'Approval KPI';
  else if (searchTerm.includes('tugas st.01')) query = 'ST.01';
  else query = searchTerm; // fallback

  const template = await prisma.letterTemplate.findFirst({
    where: { templateName: { contains: query } }
  });

  if (template) {
    await prisma.letterTemplate.update({
      where: { id: template.id },
      data: { templateContent: finalHtml }
    });
    console.log('✅ Updated', template.templateName, '<-', filename);
  } else {
    console.log('❌ Could not find DB template for', filename, '(searched for: ' + query + ')');
  }
}

async function run() {
  const rootDir = path.join(__dirname, 'templates/docx');
  const masterDir = path.join(rootDir, 'master');

  const files = fs.readdirSync(rootDir);
  for (const f of files) {
    if (f.endsWith('.docx')) await processDocx(path.join(rootDir, f));
  }

  if (fs.existsSync(masterDir)) {
    const masterFiles = fs.readdirSync(masterDir);
    for (const f of masterFiles) {
      if (f.endsWith('.docx')) await processDocx(path.join(masterDir, f));
    }
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
