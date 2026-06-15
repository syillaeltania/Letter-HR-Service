import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const htmlWrapper = (content: string) => `
<table style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; border-collapse: collapse;">
  <thead style="display: table-header-group;">
    <tr>
      <td style="padding-bottom: 20px; border-bottom: 2px solid #000; padding-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: bottom;">
              <img src="https://neuronworks.co.id/assets/images/logo/logo-nw.png" style="height: 52px;" alt="Neuronworks">
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

async function run() {
  const templates = await prisma.letterTemplate.findMany();
  for (const t of templates) {
    let content = t.templateContent;
    // Extract inner content from double wrapper
    const regex1 = /<td style="padding-top: 20px; padding-bottom: 20px; text-align: justify; vertical-align: top;">([\s\S]*?)<\/td>\s*<\/tr>\s*<\/tbody>/;
    let match = content.match(regex1);
    if (match) {
      let innerContent = match[1].trim();
      
      // Check if it has the OLD wrapper
      const regexOld = /<div style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; max-width: 800px; margin: 0 auto; background: #fff; padding: 20px;">[\s\S]*?<!-- Body -->\s*<div style="margin-bottom: 20px; text-align: justify;">([\s\S]*?)<\/div>\s*<!-- Footer -->[\s\S]*?<\/div>\s*<\/div>/;
      let matchOld = innerContent.match(regexOld);
      
      if (matchOld) {
        // It has the old wrapper inside!
        const trueContent = matchOld[1].trim();
        const fixedContent = htmlWrapper(trueContent);
        await prisma.letterTemplate.update({ where: { id: t.id }, data: { templateContent: fixedContent } });
        console.log('Fixed double wrapper for', t.templateName);
      } else {
        // Maybe it's double wrapped with the NEW wrapper? No, earlier script wrapped OLD wrapper with NEW wrapper.
      }
    }
  }
}
run().then(() => prisma.$disconnect());
