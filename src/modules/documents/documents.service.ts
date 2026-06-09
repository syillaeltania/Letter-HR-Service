import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docxtemplater = require('docxtemplater');
import PizZip = require('pizzip');
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
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

@Injectable()
export class DocumentsService {
  constructor(private readonly config: ConfigService) {}

  async renderPreview(templateContent: string, content: Record<string, unknown>, letterNumber?: string | null) {
    return this.replacePlaceholders(templateContent, { ...content, letter_number: letterNumber ?? '' });
  }

  async generateDocx(
    templateContent: string,
    content: Record<string, unknown>,
    letterNumber: string,
    docxTemplatePath?: string | null,
  ) {
    const outputDir = path.resolve(this.config.get<string>('app.generatedDocPath', './storage/generated'));
    await fs.mkdir(outputDir, { recursive: true });

    const renderData = this.buildRenderData(content, letterNumber);
    if (docxTemplatePath) {
      const templateBuffer = await fs.readFile(path.resolve(docxTemplatePath));
      const zip = new PizZip(templateBuffer);
      if (!renderData.pasal_8_point_b_text) {
        this.removeParagraphContainingPlaceholder(zip, 'pasal_8_point_b_text');
      }
      if (!renderData.additional_notes) {
        this.removeParagraphContainingPlaceholder(zip, 'additional_notes', { removeLeadingBlank: true });
      }
      this.applyPaginationRules(zip, docxTemplatePath);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
      });
      doc.render(renderData);

      const filePath = path.join(outputDir, `${randomUUID()}.docx`);
      await fs.writeFile(filePath, doc.getZip().generate({ type: 'nodebuffer' }));
      return filePath;
    }

    const body = this.replacePlaceholders(templateContent, renderData);
    const zip = new PizZip();
    zip.file('[Content_Types].xml', this.contentTypesXml());
    zip.folder('_rels')?.file('.rels', this.relationshipsXml());
    zip.folder('word')?.file('document.xml', this.documentXml(body));
    zip.folder('word')?.folder('_rels')?.file('document.xml.rels', this.documentRelationshipsXml());

    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render({});

    const filePath = path.join(outputDir, `${randomUUID()}.docx`);
    await fs.writeFile(filePath, doc.getZip().generate({ type: 'nodebuffer' }));
    return filePath;
  }

  async generatePdf(
    templateContent: string,
    content: Record<string, unknown>,
    letterNumber: string,
    docxTemplatePath?: string | null,
  ) {
    const outputDir = path.resolve(this.config.get<string>('app.generatedDocPath', './storage/generated'));
    await fs.mkdir(outputDir, { recursive: true });

    const docxPath = await this.generateDocx(templateContent, content, letterNumber, docxTemplatePath);
    const pdfSafeDocxPath = await this.createPdfSafeDocx(docxPath, outputDir);
    try {
      return await this.convertDocxToPdf(pdfSafeDocxPath, outputDir);
    } finally {
      if (pdfSafeDocxPath !== docxPath) {
        await fs.rm(pdfSafeDocxPath, { force: true });
      }
    }
  }

  private replacePlaceholders(template: string, content: Record<string, unknown>) {
    return template.replace(/\{\{(\w+)}}/g, (_match, key: string) => String(content[key] ?? ''));
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

  private removeParagraphContainingPlaceholder(zip: PizZip, placeholder: string, options: { removeLeadingBlank?: boolean } = {}) {
    const document = zip.file('word/document.xml');
    const xml = document?.asText();
    if (!xml) return;

    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g);
    if (!paragraphs) return;

    const updated = [...paragraphs];
    for (let index = updated.length - 1; index >= 0; index -= 1) {
      if (!updated[index].includes(`{{${placeholder}}}`)) continue;

      updated.splice(index, 1);
      if (options.removeLeadingBlank && index > 0 && !this.getWordParagraphText(updated[index - 1])) {
        updated.splice(index - 1, 1);
      }
      if (options.removeLeadingBlank && index < updated.length && !this.getWordParagraphText(updated[index])) {
        updated.splice(index, 1);
      }
    }

    let paragraphIndex = 0;
    zip.file('word/document.xml', xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updated[paragraphIndex++] ?? ''));
  }

  private applyPaginationRules(zip: PizZip, docxTemplatePath?: string | null) {
    const document = zip.file('word/document.xml');
    const xml = document?.asText();
    if (!xml) return;

    const cleanXml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '');
    const paragraphs = cleanXml.match(/<w:p\b[\s\S]*?<\/w:p>/g);
    if (!paragraphs) {
      zip.file('word/document.xml', cleanXml);
      return;
    }

    const updatedParagraphs = [...paragraphs];
    const headingIndexes: number[] = [];
    const shouldForceNextPage = !docxTemplatePath?.includes('kontrak-kerja-magang');

    for (let index = 0; index < updatedParagraphs.length; index += 1) {
      const text = this.getWordParagraphText(updatedParagraphs[index]);
      if (!/^Pasal \d+$/.test(text)) continue;

      headingIndexes.push(index);
      updatedParagraphs[index] = this.keepParagraphWithNext(updatedParagraphs[index]);

      if (shouldForceNextPage && FORCE_NEXT_PAGE_HEADINGS.has(text)) {
        updatedParagraphs[index] = this.ensureWordParagraphProperty(updatedParagraphs[index], 'pageBreakBefore');
      }

      const nextContentIndex = updatedParagraphs.findIndex(
        (paragraph, nextIndex) => nextIndex > index && this.getWordParagraphText(paragraph),
      );
      if (nextContentIndex !== -1) {
        updatedParagraphs[nextContentIndex] = this.keepParagraphTogether(updatedParagraphs[nextContentIndex]);
      }
    }

    const pasal20Index = headingIndexes.find(
      (index) => this.getWordParagraphText(updatedParagraphs[index]) === 'Pasal 20',
    );
    if (pasal20Index !== undefined) {
      for (let index = pasal20Index; index < updatedParagraphs.length; index += 1) {
        const text = this.getWordParagraphText(updatedParagraphs[index]);
        if (!text) continue;

        updatedParagraphs[index] = this.keepParagraphWithNext(updatedParagraphs[index]);
        if (text.includes('{{employee_name}}')) break;
      }
    }

    let paragraphIndex = 0;
    const updatedXml = cleanXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updatedParagraphs[paragraphIndex++]);

    zip.file('word/document.xml', updatedXml);
  }

  private getWordParagraphText(paragraph: string) {
    return (paragraph.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
      .map((text) => text.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private ensureWordParagraphProperty(paragraph: string, propertyName: string) {
    const propertyXml = `<w:${propertyName}/>`;
    if (paragraph.includes(propertyXml)) return paragraph;
    if (/<w:pPr\b[^>]*>/.test(paragraph)) {
      return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${propertyXml}`);
    }
    return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${propertyXml}</w:pPr>`);
  }

  private keepParagraphTogether(paragraph: string) {
    return this.ensureWordParagraphProperty(paragraph, 'keepLines');
  }

  private keepParagraphWithNext(paragraph: string) {
    return this.keepParagraphTogether(this.ensureWordParagraphProperty(paragraph, 'keepNext'));
  }

  private escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private contentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  }

  private relationshipsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  }

  private documentRelationshipsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
  }

  private documentXml(body: string) {
    const paragraphs = body
      .split('\n')
      .map(
        (line) =>
          `<w:p><w:r><w:t xml:space="preserve">${this.escapeHtml(line)}</w:t></w:r></w:p>`,
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`;
  }

  private async convertDocxToPdf(docxPath: string, outputDir: string) {
    const soffice = this.config.get<string>('LIBREOFFICE_BIN', 'soffice');
    const profileDir = path.join('/tmp', `letter-generator-libreoffice-${randomUUID()}`);
    await fs.mkdir(profileDir, { recursive: true });

    try {
      await execFileAsync(soffice, [
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        '--nodefault',
        '--nolockcheck',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        path.resolve(docxPath),
      ]);
    } finally {
      await fs.rm(profileDir, { recursive: true, force: true });
    }

    const parsedPath = path.parse(docxPath);
    const pdfPath = path.join(outputDir, `${parsedPath.name}.pdf`);
    await fs.access(pdfPath);
    return pdfPath;
  }

  private async createPdfSafeDocx(docxPath: string, outputDir: string) {
    const buffer = await fs.readFile(docxPath);
    const zip = new PizZip(buffer);
    const footerFiles = Object.keys(zip.files).filter((name) => /^word\/footer\d+\.xml$/.test(name));

    if (!footerFiles.length) {
      return docxPath;
    }

    let changed = false;
    for (const footerFile of footerFiles) {
      const footerXml = zip.file(footerFile)?.asText() ?? '';
      const footerRelsPath = `word/_rels/${path.basename(footerFile)}.rels`;
      const footerRelsXml = zip.file(footerRelsPath)?.asText() ?? '';

      if (!this.isNeuronworksCertifiedFooter(footerXml, footerRelsXml)) {
        continue;
      }

      zip.file(footerFile, this.adjustCertifiedFooterForLibreOfficePdf(footerXml));
      changed = true;
    }

    if (!changed) {
      return docxPath;
    }

    const pdfSafePath = path.join(outputDir, `${path.parse(docxPath).name}-pdf-safe.docx`);
    await fs.writeFile(pdfSafePath, zip.generate({ type: 'nodebuffer' }));
    return pdfSafePath;
  }

  private isNeuronworksCertifiedFooter(footerXml: string, footerRelsXml: string) {
    return (
      footerXml.includes('Neuronworks') &&
      footerRelsXml.includes('rId1') &&
      footerRelsXml.includes('rId2') &&
      footerRelsXml.includes('rId3')
    );
  }

  private adjustCertifiedFooterForLibreOfficePdf(footerXml: string) {
    return footerXml.replace(
      /(<wp:positionV[^>]*relativeFrom="paragraph"><wp:posOffset>)-?\d+(<\/wp:posOffset><\/wp:positionV>)/g,
      '$1-80000$2',
    );
  }
}
