import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import PizZip = require('pizzip');

const COMPANY_DEFAULTS = {
  company_name: 'PT. Neuronworks Indonesia',
  company_address: 'Komplek Buah Batu Regency No 9-10 Blok A2, Kujangsari Bandung',
  signer_name: 'Sriyanto',
  signer_position: 'Direktur',
  signer_nik: '1800802001',
};
const CURRENCY_FIELDS = [
  'basic_salary_and_allowance_total',
  'basic_salary',
  'transport_allowance',
  'health_allowance',
  'position_allowance',
  'communication_allowance',
  'operational_allowance',
  'spouse_allowance',
  'child_allowance_1',
  'child_allowance_2',
  'child_allowance_3',
  'insurance_allowance_total',
  'bpjs_health_1_percent',
  'jht_2_percent',
  'jp_1_percent',
  'total_basic_salary_and_allowance',
  'bpjs_health_employee',
  'jht_employee',
  'jp_employee',
  'additional_income_total',
  'transport_rental',
  'meal_allowance',
  'overtime_workday',
  'overtime_non_workday',
  'infrastructure_rental',
  'attendance_bonus',
  'kpi_bonus',
  'deduction_total',
  'pph_deduction',
  'trial_deduction',
  'bpjs_health_deduction_1_percent',
  'jht_deduction_2_percent',
  'jp_deduction_1_percent',
  'total_net_salary',
  'bpjs_health_deduction',
  'jht_deduction',
  'jp_deduction',
  'total_salary',
  'bpjs_health_company_4_percent',
  'jht_company_3_7_percent',
  'jp_company_2_percent',
  'jkk_company_0_24_percent',
  'jkm_company_0_3_percent',
  'total_company_bpjs_contribution',
  'bpjs_health_company',
  'jht_company',
  'jp_company',
  'jkk_company',
  'jkm_company',
  'total_company_bpjs',
  'overtime_workday_rate',
  'overtime_holiday_rate',
];
const DATE_FIELDS = [
  'offering_date',
  'start_work_date',
  'approval_letter_date',
  'joining_date',
  'approval_date',
];
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const FORCE_NEXT_PAGE_HEADINGS = new Set(['Pasal 3', 'Pasal 6', 'Pasal 20']);
const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const CONTRACT_DOCX_TEMPLATE_PATH = path.resolve(process.cwd(), 'templates/docx/kontrak-kerja-karyawan.docx');
const CONTRACT_DOCX_ASSETS = {
  headerLogo: 'word/media/image1.png',
  footerLogoPrimary: 'word/media/footer-reference-image2.png',
  footerLogoSecondary: 'word/media/footer-reference-image3.png',
  footerLine: 'word/media/footer-reference-image4.png',
};

@Injectable()
export class DocumentsService {
  constructor(private readonly config: ConfigService) {}

  async renderPreview(templateContent: string, content: Record<string, unknown>, letterNumber?: string | null) {
    return this.replacePlaceholders(templateContent, { ...content, letter_number: letterNumber ?? '' });
  }

  async generatePdf(templateContent: string, content: Record<string, unknown>, letterNumber: string) {
    const outputDir = path.resolve(this.config.get<string>('app.generatedDocPath', './storage/generated'));
    await fs.mkdir(outputDir, { recursive: true });

    const renderData = this.buildRenderData(content, letterNumber);
    const htmlBody = this.prepareHtmlForPdf(this.replacePlaceholders(templateContent, renderData));
    const assets = this.loadContractDocxAssets();

    const pdfPath = path.join(outputDir, `${randomUUID()}.pdf`);

    const isProd = process.env.NODE_ENV === 'production';
    const puppeteer = (await eval(`import('puppeteer-core')`)).default;
    const chromium = (await eval(`import('@sparticuz/chromium')`)).default;

    const executablePath = isProd
      ? await chromium.executablePath()
      : process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'linux'
      ? '/usr/bin/google-chrome'
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    const browser = await puppeteer.launch({
      args: isProd ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(htmlBody, { waitUntil: 'load' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: this.buildPdfHeaderTemplate(letterNumber, assets.headerLogo),
      footerTemplate: this.buildPdfFooterTemplate(assets),
      margin: { top: '36.8mm', right: '16.5mm', bottom: '35mm', left: '23.9mm' },
    });
    await browser.close();

    return pdfPath;
  }
  private replacePlaceholders(template: string, content: Record<string, unknown>) {
    return template.replace(/\{\{(\w+)}}/g, (_match, key: string) => String(content[key] ?? ''));
  }

  private prepareHtmlForPdf(htmlBody: string) {
    const assets = this.loadContractDocxAssets();
    let html = htmlBody;

    if (assets.headerLogo) {
      html = html.replace(
        /<img\b([^>]*(?:alt=["']Neuronworks["']|logo-nw|Neuronworks)[^>]*)>/i,
        (_match, attrs: string) => {
          const normalizedAttrs = attrs
            .replace(/\s+src=(["']).*?\1/i, '')
            .replace(/\s+style=(["']).*?\1/i, '');
          return `<img${normalizedAttrs} src="${assets.headerLogo}" style="width: 160px; height: auto;" />`;
        },
      );
    }
    html = this.extractTableHeader(html);

    html = this.normalizeContractFooter(html, assets);
    html = this.extractTableFooter(html);
    html = this.standardizeDocumentHeadings(html);
    html = this.markPasalHeadings(html);

    html = html
      .replace(/border-top:\s*2px\s+solid\s+#[0-9a-f]{3,6};?/gi, '')
      .replace(
        /(<span\b[^>]*font-size:\s*)\d+(?:\.\d+)?pt([^>]*>\s*\{\{letter_number}}<\/span>)/gi,
        (_match, before: string, after: string) => `${before}6pt${after}`,
      );

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4;
      margin: 36.8mm 16.5mm 35mm 23.9mm;
    }
    html,
    body {
      margin: 0;
      padding: 0;
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.15;
      color: #000;
    }
    table {
      max-width: 100%;
    }
    p,
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .nw-pasal-heading {
      text-align: center !important;
      font-weight: 700 !important;
      break-after: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .nw-document-title {
      text-align: center !important;
      font-family: Verdana, Arial, Helvetica, sans-serif !important;
      font-size: 14pt !important;
      font-weight: 700 !important;
      text-decoration: underline !important;
      line-height: 1.15 !important;
    }
    .nw-letter-number-subtitle {
      text-align: center !important;
      font-family: Verdana, Arial, Helvetica, sans-serif !important;
      font-size: 10pt !important;
      font-weight: 700 !important;
      line-height: 1.15 !important;
    }
    .nw-after-pasal-heading {
      break-before: avoid;
      page-break-before: avoid;
    }
    .nw-print-header {
      position: fixed;
      top: -32.8mm;
      left: 23.9mm;
      right: 16.5mm;
      width: calc(100% - 40.4mm);
      z-index: 2;
    }
    .nw-print-header table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    .nw-print-header tr {
      display: table-row !important;
    }
    .nw-print-header td {
      display: table-cell !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      border-bottom: 0 !important;
    }
    .nw-print-header,
    .nw-print-header * {
      font-size: 6pt !important;
    }
    .nw-print-header img {
      width: 56.6mm !important;
      height: 12.7mm !important;
      object-fit: contain !important;
    }
    tfoot,
    tfoot * {
      font-size: 6pt !important;
    }
    .nw-footer-line {
      display: block;
      flex: 1 1 auto;
      width: auto;
      height: 0.8mm;
      object-fit: fill;
    }
  </style>
</head>
<body>${html}</body>
</html>`;
  }

  private extractTableHeader(html: string) {
    const docxHeaderMatch = html.match(/<div\b[^>]*class=["'][^"']*\bdocx-header\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (docxHeaderMatch) {
      return html.replace(docxHeaderMatch[0], '');
    }

    const headerMatch = html.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
    if (!headerMatch) return html;

    return html.replace(headerMatch[0], '');
  }

  private normalizeContractFooter(html: string, assets: ReturnType<DocumentsService['loadContractDocxAssets']>) {
    const footerLogos = [
      assets.footerLogoPrimary
        ? `<img class="nw-footer-logo" src="${assets.footerLogoPrimary}" style="width:12.17mm;height:7.94mm;object-fit:contain;margin-right:1.5mm;vertical-align:bottom;" alt="ISO certification">`
        : '',
      assets.footerLogoSecondary
        ? `<img class="nw-footer-logo" src="${assets.footerLogoSecondary}" style="width:11.91mm;height:7.67mm;object-fit:contain;vertical-align:bottom;" alt="ISO certification">`
        : '',
    ].join('');
    const footerLine = assets.footerLine
      ? `<img class="nw-footer-line" src="${assets.footerLine}" alt="" />`
      : '<span class="nw-footer-line"></span>';
    const footer = `<tfoot style="display:table-footer-group;">
    <tr>
      <td style="padding-top:0;">
        <table class="nw-footer-table" style="width:100%; border-collapse:collapse; font-family:Verdana, Arial, Helvetica, sans-serif; font-size:6pt; line-height:1.15; color:#000;">
          <tr>
            <td style="width:30%; height:9mm; vertical-align:bottom; text-align:left; padding:0 0 1mm 0;">
              <div class="nw-footer-certified-row" style="display:flex; align-items:flex-end; gap:1.5mm; height:8mm; white-space:nowrap;">
                <strong style="font-size:6pt; line-height:1.15;">Certified By:</strong>
                <span class="nw-footer-logos" style="display:inline-flex; align-items:flex-end; white-space:nowrap;">${footerLogos}</span>
              </div>
            </td>
            <td style="width:70%; padding:0;"></td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0;">
              <div class="nw-footer-rule" style="display:flex; align-items:center; width:100%;">
                ${footerLine}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0;"></td>
            <td class="nw-footer-address" style="padding:1mm 0 0 0; text-align:right; vertical-align:top; font-size:6pt; line-height:1.15; color:#000;">
              <div><strong>PT. Neuronworks Indonesia</strong> Komp. Buah Batu Regency A2 No.9-10 kel. Kujangsari kec. Bandung Kidul</div>
              <div>Kota Bandung Jawa Barat - Indonesia 40287&nbsp; Phone. 022-8730 9898, Fax. 022-8730 9898</div>
              <div>www.neuronworks.co.id</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </tfoot>`;

    if (/<tfoot\b[^>]*>[\s\S]*?<\/tfoot>/i.test(html)) {
      return html.replace(/<tfoot\b[^>]*>[\s\S]*?<\/tfoot>/gi, footer);
    }

    return html;
  }

  private extractTableFooter(html: string) {
    return html.replace(/<tfoot\b[^>]*>[\s\S]*?<\/tfoot>/gi, '');
  }

  private standardizeDocumentHeadings(html: string) {
    let titleMarked = false;
    let markNextLetterNumber = false;

    return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs: string, inner: string) => {
      const text = this.htmlToPlainText(inner);
      if (!text) return match;

      if (!titleMarked && this.isDocumentTitle(text)) {
        titleMarked = true;
        markNextLetterNumber = true;
        return this.replaceHtmlTagInner(this.addClassToHtmlTag(match, 'nw-document-title'), this.spaceDocumentTitle(text));
      }

      if (markNextLetterNumber && this.isLetterNumberSubtitle(text)) {
        markNextLetterNumber = false;
        return this.addClassToHtmlTag(match, 'nw-letter-number-subtitle');
      }

      if (!/^Nomor\s*:/i.test(text)) {
        markNextLetterNumber = false;
      }

      return match;
    });
  }

  private markPasalHeadings(html: string) {
    let markNextParagraph = false;

    return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs: string, inner: string) => {
      const text = this.htmlToPlainText(inner);

      if (markNextParagraph && text) {
        markNextParagraph = false;
        return this.addClassToHtmlTag(match, 'nw-after-pasal-heading');
      }

      if (/^Pasal\s+\d+[A-Za-z]?$/.test(text)) {
        markNextParagraph = true;
        return this.addClassToHtmlTag(match, 'nw-pasal-heading');
      }

      return match;
    });
  }

  private addClassToHtmlTag(html: string, className: string) {
    if (/\sclass=(["'])/.test(html)) {
      return html.replace(/\sclass=(["'])(.*?)\1/, (_match, quote: string, classes: string) => {
        if (classes.split(/\s+/).includes(className)) return ` class=${quote}${classes}${quote}`;
        return ` class=${quote}${classes} ${className}${quote}`;
      });
    }

    return html.replace(/^<([a-z0-9]+)\b/i, `<$1 class="${className}"`);
  }

  private replaceHtmlTagInner(html: string, nextInner: string) {
    return html.replace(/^(<[^>]+>)[\s\S]*(<\/[^>]+>)$/, `$1${nextInner}$2`);
  }

  private htmlToPlainText(html: string) {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isDocumentTitle(text: string) {
    if (!/^[A-Z0-9\s().,/&-]+$/.test(text)) return false;
    if (!/\s/.test(text)) return false;
    if (/^Nomor\s*:/i.test(text)) return false;
    if (/^Pasal\s+\d+/i.test(text)) return false;
    return /^(SURAT|KONTRAK|PERJANJIAN|BERITA|BAST|SK)\b/i.test(text);
  }

  private isLetterNumberSubtitle(text: string) {
    return /^Nomor\s*:\s*(?:\{\{letter_number}}|[A-Z0-9./-]+)/i.test(text);
  }

  private spaceDocumentTitle(text: string) {
    return text
      .split(/\s+/)
      .map((word) => (/^[A-Z]+$/.test(word) ? word.split('').join(' ') : word))
      .join('&nbsp;&nbsp;');
  }

  private buildPdfHeaderTemplate(letterNumber: string, headerLogo: string) {
    const logo = headerLogo
      ? `<img src="${headerLogo}" style="width:56.6mm;height:12.7mm;object-fit:contain;display:block;margin-left:auto;" />`
      : '';

    return `
      <div style="width:100%;padding:4mm 16.5mm 0 23.9mm;box-sizing:border-box;font-family:Verdana,Arial,Helvetica,sans-serif;font-size:6pt;line-height:1;color:#000;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tr>
            <td style="width:50%;vertical-align:top;text-align:left;padding:0;border:0;font-size:6pt;line-height:1;">${letterNumber}</td>
            <td style="width:50%;vertical-align:top;text-align:right;padding:0;border:0;">${logo}</td>
          </tr>
        </table>
      </div>`;
  }

  private buildPdfFooterTemplate(assets: ReturnType<DocumentsService['loadContractDocxAssets']>) {
    const footerLogos = [
      assets.footerLogoPrimary
        ? `<img src="${assets.footerLogoPrimary}" style="width:12.17mm;height:7.94mm;object-fit:contain;margin-right:1.5mm;vertical-align:bottom;" alt="ISO certification">`
        : '',
      assets.footerLogoSecondary
        ? `<img src="${assets.footerLogoSecondary}" style="width:11.91mm;height:7.67mm;object-fit:contain;vertical-align:bottom;" alt="ISO certification">`
        : '',
    ].join('');
    const footerLine = assets.footerLine
      ? `<img src="${assets.footerLine}" style="display:block;width:100%;height:0.8mm;object-fit:fill;" alt="" />`
      : '<span style="display:block;width:100%;height:0.8mm;border-top:0.8mm solid #000;"></span>';

    return `
      <div style="width:100%;padding:0 16.5mm 4mm 23.9mm;box-sizing:border-box;font-family:Verdana,Arial,Helvetica,sans-serif;font-size:6pt;line-height:1.15;color:#000;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tr>
            <td style="width:30%;height:9mm;vertical-align:bottom;text-align:left;padding:0 0 1mm 0;border:0;">
              <div style="display:flex;align-items:flex-end;gap:1.5mm;height:8mm;white-space:nowrap;">
                <strong style="font-size:6pt;line-height:1.15;">Certified By:</strong>
                <span style="display:inline-flex;align-items:flex-end;white-space:nowrap;">${footerLogos}</span>
              </div>
            </td>
            <td style="width:70%;padding:0;border:0;"></td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0;border:0;">${footerLine}</td>
          </tr>
          <tr>
            <td style="padding:0;border:0;"></td>
            <td style="padding:1mm 0 0 0;border:0;text-align:right;vertical-align:top;font-size:6pt;line-height:1.15;color:#000;">
              <div><strong>PT. Neuronworks Indonesia</strong> Komp. Buah Batu Regency A2 No.9-10 kel. Kujangsari kec. Bandung Kidul</div>
              <div>Kota Bandung Jawa Barat - Indonesia 40287&nbsp; Phone. 022-8730 9898, Fax. 022-8730 9898</div>
              <div>www.neuronworks.co.id</div>
            </td>
          </tr>
        </table>
      </div>`;
  }

  private loadContractDocxAssets() {
    const asset = (docxPath: string) => this.readDocxImageAsDataUri(CONTRACT_DOCX_TEMPLATE_PATH, docxPath);

    return {
      headerLogo: asset(CONTRACT_DOCX_ASSETS.headerLogo),
      footerLogoPrimary: asset(CONTRACT_DOCX_ASSETS.footerLogoPrimary),
      footerLogoSecondary: asset(CONTRACT_DOCX_ASSETS.footerLogoSecondary),
      footerLine: asset(CONTRACT_DOCX_ASSETS.footerLine),
    };
  }

  private readDocxImageAsDataUri(docxPath: string, imagePath: string) {
    try {
      const zip = new PizZip(readFileSync(docxPath));
      const image = zip.file(imagePath)?.asUint8Array();
      if (!image) return '';
      return `data:image/png;base64,${Buffer.from(image).toString('base64')}`;
    } catch {
      return '';
    }
  }

  private buildRenderData(content: Record<string, unknown>, letterNumber: string): Record<string, unknown> {
    const textValue = (value: unknown) => (typeof value === 'string' ? value.trim() : value);
    const explicitBirthPlaceDate = textValue(content.employee_birth_place_date);
    const employeeBirthPlace = textValue(content.employee_birth_place);
    const employeeBirthDate = textValue(content.employee_birth_date);
    const employeeBirthPlaceDate =
      explicitBirthPlaceDate || [employeeBirthPlace, employeeBirthDate].filter(Boolean).join(', ');
    const explicitInternBirthPlaceDate = textValue(content.intern_birth_place_date);
    const internBirthPlace = textValue(content.intern_birth_place);
    const internBirthDate = textValue(content.intern_birth_date);
    const internBirthPlaceDate =
      explicitInternBirthPlaceDate || [internBirthPlace, internBirthDate].filter(Boolean).join(', ');
    const formattedContent = { ...content };
    const letterDateParts = this.buildLetterDateParts(
      formattedContent.letter_date,
      formattedContent.letter_date_text,
      formattedContent.letter_year_text,
      formattedContent.letter_day_name ?? formattedContent.letter_day,
      formattedContent.letter_day_text,
      formattedContent.letter_month_text,
    );
    const fallbackSequence = formattedContent.sequence_number
      ? String(formattedContent.sequence_number).padStart(3, '0')
      : formattedContent.letter_sequence;
    const now = new Date();
    const isOfferingLetter = formattedContent.letter_type_code === 'KK.01-OL';
    if (isOfferingLetter) {
      formattedContent.candidate_name = formattedContent.candidate_name ?? formattedContent.candidateName ?? '';
      this.applyOfferingSalaryAliases(formattedContent);
    }
    formattedContent.letter_date = this.formatIndonesianDate(formattedContent.letter_date);
    for (const field of DATE_FIELDS) {
      formattedContent[field] = this.formatIndonesianDate(formattedContent[field]);
    }

    for (const field of CURRENCY_FIELDS) {
      formattedContent[field] = this.formatCurrencyValue(formattedContent[field], {
        style: isOfferingLetter ? 'offering' : 'contract',
      });
    }

    formattedContent.pasal_8_point_b_text =
      formattedContent.pasal_8_point_b_enabled === 'Ada' ? formattedContent.pasal_8_point_b_text : '';
    formattedContent.working_schedule =
      formattedContent.working_schedule ||
      [formattedContent.working_days, formattedContent.working_hours].filter(Boolean).join(' : ');
    formattedContent.basic_salary_monthly = formattedContent.basic_salary_monthly || (formattedContent.basic_salary ? `${formattedContent.basic_salary}/Bulan` : '');
    formattedContent.meal_allowance_daily =
      formattedContent.meal_allowance_daily || (formattedContent.meal_allowance ? `${formattedContent.meal_allowance}/Hari` : '');

    return {
      ...COMPANY_DEFAULTS,
      ...formattedContent,
      ...letterDateParts,
      letter_number: letterNumber,
      letter_sequence: fallbackSequence,
      letter_month_roman: formattedContent.letter_month_roman || ROMAN_MONTHS[now.getMonth()],
      letter_year: formattedContent.letter_year || now.getFullYear(),
      employee_id_number: formattedContent.employee_id_number || formattedContent.employee_ktp,
      employee_birth_place_date: employeeBirthPlaceDate,
      intern_birth_place_date: internBirthPlaceDate,
    };
  }

  private applyOfferingSalaryAliases(content: Record<string, unknown>) {
    const aliases: Record<string, string> = {
      bpjs_health_1_percent: 'bpjs_health_employee',
      jht_2_percent: 'jht_employee',
      jp_1_percent: 'jp_employee',
      total_basic_salary_and_allowance: 'total_salary',
      bpjs_health_deduction_1_percent: 'bpjs_health_deduction',
      jht_deduction_2_percent: 'jht_deduction',
      jp_deduction_1_percent: 'jp_deduction',
      total_net_salary: 'total_salary',
      bpjs_health_company_4_percent: 'bpjs_health_company',
      jht_company_3_7_percent: 'jht_company',
      jp_company_2_percent: 'jp_company',
      jkk_company_0_24_percent: 'jkk_company',
      jkm_company_0_3_percent: 'jkm_company',
      total_company_bpjs_contribution: 'total_company_bpjs',
    };

    for (const [target, source] of Object.entries(aliases)) {
      if (!content[target] && content[source]) content[target] = content[source];
    }
  }

  private buildLetterDateParts(
    letterDate: unknown,
    letterDateText: unknown,
    letterYearText: unknown,
    letterDayName: unknown,
    letterDayText: unknown,
    letterMonthText: unknown,
  ) {
    const parsedDate = this.parseIsoDate(letterDate);
    const splitParts = this.splitLetterDateText(letterDateText, letterYearText);

    if (!parsedDate) {
      return {
        ...splitParts,
        letter_day_name: typeof letterDayName === 'string' ? letterDayName.trim() : '',
        letter_day_text: typeof letterDayText === 'string' ? letterDayText.trim() : '',
        letter_month_text: typeof letterMonthText === 'string' ? letterMonthText.trim() : '',
      };
    }

    return {
      letter_day_name: typeof letterDayName === 'string' && letterDayName.trim() ? letterDayName.trim() : INDONESIAN_DAYS[parsedDate.getDay()],
      letter_day_text:
        typeof letterDayText === 'string' && letterDayText.trim()
          ? letterDayText.trim()
          : this.numberToIndonesianWords(parsedDate.getDate()),
      letter_month_text:
        typeof letterMonthText === 'string' && letterMonthText.trim()
          ? letterMonthText.trim()
          : INDONESIAN_MONTHS[parsedDate.getMonth()],
      letter_date_text:
        splitParts.letter_date_text ||
        `${this.numberToIndonesianWords(parsedDate.getDate())} bulan ${INDONESIAN_MONTHS[parsedDate.getMonth()]}`,
      letter_year_text: splitParts.letter_year_text || this.numberToIndonesianWords(parsedDate.getFullYear()),
    };
  }

  private splitLetterDateText(letterDateText: unknown, letterYearText: unknown) {
    const dateText = typeof letterDateText === 'string' ? letterDateText.trim() : '';
    const yearText = typeof letterYearText === 'string' ? letterYearText.trim() : '';

    if (yearText || !dateText.includes(' tahun ')) {
      return {
        letter_date_text: dateText,
        letter_year_text: yearText,
      };
    }

    const [datePart, yearPart] = dateText.split(' tahun ');
    return {
      letter_date_text: datePart.trim(),
      letter_year_text: yearPart.trim(),
    };
  }

  private formatCurrencyValue(value: unknown, options: { style?: 'contract' | 'offering' } = {}) {
    if (value === null || value === undefined) return '';
    const rawValue = String(value).trim();
    if (!rawValue) return '';

    const digits = rawValue.replace(/\D/g, '');
    if (!digits) return rawValue;

    if (options.style === 'offering') {
      return `Rp ${Number(digits).toLocaleString('id-ID')}`;
    }

    if (/^Rp[\d.]+,-$/.test(rawValue)) return rawValue;
    return `Rp${Number(digits).toLocaleString('id-ID')},-`;
  }

  private formatIndonesianDate(value: unknown) {
    const rawValue = String(value ?? '').trim();
    const date = this.parseIsoDate(rawValue);
    if (!date) return rawValue;

    return `${date.getDate().toString().padStart(2, '0')} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  private parseIsoDate(value: unknown) {
    const rawValue = String(value ?? '').trim();
    if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return null;

    const date = new Date(`${rawValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private numberToIndonesianWords(value: number): string {
    const units = [
      '',
      'Satu',
      'Dua',
      'Tiga',
      'Empat',
      'Lima',
      'Enam',
      'Tujuh',
      'Delapan',
      'Sembilan',
      'Sepuluh',
      'Sebelas',
    ];

    if (value < 12) return units[value];
    if (value < 20) return `${units[value - 10]} Belas`;
    if (value < 100) {
      return [units[Math.floor(value / 10)], 'Puluh', units[value % 10]].filter(Boolean).join(' ');
    }
    if (value < 200) return ['Seratus', this.numberToIndonesianWords(value - 100)].filter(Boolean).join(' ');
    if (value < 1000) {
      return [units[Math.floor(value / 100)], 'Ratus', this.numberToIndonesianWords(value % 100)].filter(Boolean).join(' ');
    }
    if (value < 2000) return ['Seribu', this.numberToIndonesianWords(value - 1000)].filter(Boolean).join(' ');
    return [this.numberToIndonesianWords(Math.floor(value / 1000)), 'Ribu', this.numberToIndonesianWords(value % 1000)]
      .filter(Boolean)
      .join(' ');
  }


}
