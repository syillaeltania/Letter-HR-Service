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

function formatMammothHTML(html: string) {
  // 1. Titles
  html = html.replace(/<p>(?:<br\s*\/>\s*)*<strong>(K\s*O\s*N\s*T\s*R\s*A\s*K[\s\S]*?)<\/strong><\/p>/gi, 
    '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px; text-align: center;">$1</td></tr></table>'
  );
  html = html.replace(/<p>(?:<br\s*\/>\s*)*<strong>(S\s*U\s*R\s*A\s*T[\s\S]*?)<\/strong><\/p>/gi, 
    '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px; text-align: center;">$1</td></tr></table>'
  );
  html = html.replace(/<p>(?:<br\s*\/>\s*)*<strong>(SURAT[\s\S]*?)<\/strong><\/p>/gi, 
    '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px; text-align: center;">$1</td></tr></table>'
  );

  // 2. Nomor
  html = html.replace(/<p>(?:<strong>)?Nomor\s*:\s*\{\{letter_number\}\}(?:<\/strong>)?<\/p>/gi, 
    '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;"><tr><td style="font-size: 11pt; text-align: center;">Nomor : {{letter_number}}</td></tr></table>'
  );

  // 3. Tab converter (Kontrak Kerja Karyawan style)
  const lines = html.split('</p>');
  let inTabTable = false;
  let newHtml = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim()) continue;
    line = line + '</p>'; 

    const match = line.match(/<p>([\s\S]+?)\t+\s*:\s*([\s\S]*?)<\/p>/);
    if (match) {
      if (!inTabTable) {
        newHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">\n';
        inTabTable = true;
      }
      let label = match[1].replace(/<[^>]+>/g, '').trim(); 
      let val = match[2].trim();
      newHtml += `<tr><td style="width: 20%; vertical-align: top; padding: 2px 0;">${label}</td><td style="width: 5%; vertical-align: top; padding: 2px 0;">:</td><td style="width: 75%; vertical-align: top; padding: 2px 0;">${val}</td></tr>\n`;
    } else {
      if (inTabTable) {
        newHtml += '</table>\n';
        inTabTable = false;
      }
      newHtml += line + '\n';
    }
  }
  if (inTabTable) newHtml += '</table>\n';
  html = newHtml;

  // 4. Style all Mammoth-generated <table> elements
  html = html.replace(/<table>/gi, '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">');
  html = html.replace(/<td\b[^>]*>/gi, '<td style="vertical-align: top; padding: 2px 5px;">');
  
  // Specific fix for "Kompensasi" table in Offering Letter (add borders)
  if (html.includes('Kompensasi') && html.includes('Komponen')) {
     html = html.replace(/<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">/i, '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;" border="1">');
  }

  // Ensure "PIHAK PERTAMA" signature block uses standard table spacing
  html = html.replace(/<p><strong>PIHAK PERTAMA<\/strong><\/p>/gi, '<br><br><br><p><strong>PIHAK PERTAMA</strong></p>');
  html = html.replace(/<p><strong>PIHAK KEDUA<\/strong><\/p>/gi, '<br><br><br><p><strong>PIHAK KEDUA</strong></p>');

  return html;
}

async function run() {
  const templates = await prisma.letterTemplate.findMany();
  
  const map: Record<string, string> = {
    'Template Kontrak Kerja Karyawan': 'kontrak-kerja-karyawan.docx',
    'Template Kontrak Kerja Freelancer': 'kontrak-kerja-freelancer.docx',
    'Template Kontrak Kerja Magang': 'kontrak-kerja-magang.docx',
    'Template Surat Peringatan 1': 'surat-peringatan-sp1.docx',
    'Template Surat Peringatan 2': 'surat-peringatan-sp2.docx',
    'Template Surat Peringatan 3': 'surat-peringatan-sp3.docx',
    'Template Surat Cuti': 'surat-cuti.docx',
    'Template Offering Letter': 'offering-letter.docx',
    'Template Surat Keterangan Kerja': 'surat-keterangan-kerja-skk.docx',
    'Template Surat Tugas - ST.01': 'master/master-surat-tugas-st.01.docx',
    'Template Surat Tugas - ST.02': 'master/master-surat-tugas-st.02.docx',
    'Template Surat Tugas - ST.03': 'master/master-surat-tugas-st.03.docx',
    'Template Surat Edaran': 'master/master-surat-edaran-se.docx',
    'Template Surat Pengumuman': 'master/master-surat-pengumuman-sp.docx',
    'Template Surat Keputusan': 'master/master-surat-keputusan-sk.docx',
    'Template Surat Instruksi': 'master/master-surat-instruksi-si.docx',
    'Template Surat Kuasa': 'master/master-surat-kuasa-sk.docx',
    'Template Berita Acara': 'master/master-berita-acara-ba.docx',
    'Template Notulen Rapat': 'master/master-notulen-rapat-nr.docx',
    'Template Surat Pengantar': 'master/master-surat-pengantar-sp.docx',
    'Template Memo Internal': 'master/master-memo-internal-mi.docx',
    'Template Surat Undangan': 'master/master-surat-undangan-su.docx',
    'Template Surat Panggilan': 'master/master-surat-panggilan-sp.docx',
    'Template Surat Pemberitahuan': 'master/master-surat-pemberitahuan-sp.docx',
  };

  for (const t of templates) {
    const filename = map[t.templateName];
    if (!filename) continue;
    
    const filepath = path.join(__dirname, 'templates/docx', filename);
    if (!fs.existsSync(filepath)) continue;

    const result = await mammoth.convertToHtml({ path: filepath });
    let html = result.value;
    
    html = formatMammothHTML(html);
    html = htmlWrapper(html);
    
    await prisma.letterTemplate.update({
      where: { id: t.id },
      data: { templateContent: html }
    });
    console.log('✅ Extracted and aligned:', t.templateName);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
