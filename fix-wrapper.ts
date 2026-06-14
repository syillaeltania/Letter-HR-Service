import * as fs from 'fs';
import * as path from 'path';
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

async function run() {
  const templates = await prisma.letterTemplate.findMany();
  for (const template of templates) {
    if (!template.templateContent) continue;
    
    // Extract inner content from current wrapper
    const match = template.templateContent.match(/<tbody[^>]*>[\s]*<tr>[\s]*<td[^>]*>([\s\S]*?)<\/td>[\s]*<\/tr>[\s]*<\/tbody>/i);
    if (!match) continue;
    
    let content = match[1];
    
    // If it's a LibreOffice template with <p align="center"> that looks bad in Jodit, 
    // let's wrap center-aligned paragraphs in a table to ensure Jodit renders them perfectly!
    content = content.replace(/<p align="center"[^>]*>([\s\S]*?)<\/p>/gi, 
      '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 10px;"><tr><td style="text-align: center;">$1</td></tr></table>'
    );
    
    const finalHtml = htmlWrapper(content);
    
    await prisma.letterTemplate.update({
      where: { id: template.id },
      data: { templateContent: finalHtml }
    });
  }
  console.log('✅ Updated all templates with proper Header (Logo & Letter Number) and Base64 Footer Logo');
}

run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
