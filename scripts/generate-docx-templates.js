const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'templates', 'docx');

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const replaceAll = (value, replacements) => {
  let output = value;
  for (const [from, to] of replacements) {
    output = output.split(xmlEscape(from)).join(xmlEscape(to));
  }
  return output;
};

const wText = (value) => `<w:t xml:space="preserve">${xmlEscape(value)}</w:t>`;
const wRun = (value, bold = false, italic = false) =>
  [
    '<w:r>',
    '<w:rPr>',
    '<w:rFonts w:ascii="Verdana" w:eastAsia="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>',
    bold ? '<w:b/><w:bCs/>' : '',
    italic ? '<w:i/><w:iCs/>' : '',
    '<w:color w:val="000000" w:themeColor="text1"/>',
    '<w:sz w:val="20"/><w:szCs w:val="20"/>',
    '</w:rPr>',
    wText(value),
    '</w:r>',
  ].join('');

const replaceInBlock = (xml, marker, from, to) => {
  const markerIndex = xml.indexOf(marker);
  if (markerIndex === -1) return xml;

  const replacementIndex = xml.indexOf(from, markerIndex);
  if (replacementIndex === -1) return xml;

  return `${xml.slice(0, replacementIndex)}${to}${xml.slice(replacementIndex + from.length)}`;
};

const paragraphText = (paragraph) =>
  (paragraph.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
    .map((text) => text.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

const ensureParagraphProperty = (paragraph, propertyName) => {
  const propertyXml = `<w:${propertyName}/>`;
  if (paragraph.includes(propertyXml)) return paragraph;
  if (/<w:pPr\b[^>]*>/.test(paragraph)) {
    return paragraph.replace(/<w:pPr\b[^>]*>/, (match) => `${match}${propertyXml}`);
  }
  return paragraph.replace(/(<w:p\b[^>]*>)/, `$1<w:pPr>${propertyXml}</w:pPr>`);
};

const keepParagraphTogether = (paragraph) => ensureParagraphProperty(paragraph, 'keepLines');

const keepParagraphWithNext = (paragraph) =>
  keepParagraphTogether(ensureParagraphProperty(paragraph, 'keepNext'));

const addPageBreakBefore = (paragraph) => ensureParagraphProperty(paragraph, 'pageBreakBefore');
const FORCE_NEXT_PAGE_HEADINGS = new Set(['Pasal 3', 'Pasal 6', 'Pasal 20']);

const applyKk01PaginationRules = (xml) => {
  const cleanXml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '');
  const paragraphs = cleanXml.match(/<w:p\b[\s\S]*?<\/w:p>/g);
  if (!paragraphs) return cleanXml;

  const updatedParagraphs = [...paragraphs];
  const headingIndexes = [];

  for (let index = 0; index < updatedParagraphs.length; index += 1) {
    const text = paragraphText(updatedParagraphs[index]);
    if (!/^Pasal \d+$/.test(text)) continue;

    headingIndexes.push(index);
    updatedParagraphs[index] = keepParagraphWithNext(updatedParagraphs[index]);

    if (FORCE_NEXT_PAGE_HEADINGS.has(text)) {
      updatedParagraphs[index] = addPageBreakBefore(updatedParagraphs[index]);
    }

    const nextContentIndex = updatedParagraphs.findIndex(
      (paragraph, nextIndex) => nextIndex > index && paragraphText(paragraph),
    );
    if (nextContentIndex !== -1) {
      updatedParagraphs[nextContentIndex] = keepParagraphTogether(updatedParagraphs[nextContentIndex]);
    }
  }

  const pasal20Index = headingIndexes.find((index) => paragraphText(updatedParagraphs[index]) === 'Pasal 20');
  if (pasal20Index !== undefined) {
    for (let index = pasal20Index; index < updatedParagraphs.length; index += 1) {
      const text = paragraphText(updatedParagraphs[index]);
      if (!text) continue;

      updatedParagraphs[index] = keepParagraphWithNext(updatedParagraphs[index]);
      if (text.includes('{{employee_name}}')) break;
    }
  }

  let paragraphIndex = 0;
  return cleanXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => updatedParagraphs[paragraphIndex++]);
};

const postProcessKk01Xml = (xml) => {
  let output = xml;

  output = output.replace(
    /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t>Pada hari ini,<\/w:t><\/w:r>[\s\S]*?<w:t xml:space="preserve">kami yang bertanda tangan di bawah ini : <\/w:t><\/w:r>/,
    [
      wRun('Pada hari ini, '),
      wRun('{{letter_day}}', true, true),
      wRun(' tanggal '),
      wRun('{{letter_date_text}}', true, true),
      wRun(' tahun '),
      wRun('{{letter_year_text}}', true, true),
      wRun(', kami yang bertanda tangan di bawah ini : '),
    ].join(''),
  );

  output = output.replace(
    /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t xml:space="preserve">Bahwa perjanjian kerja ini diadakan dari tanggal <\/w:t><\/w:r>[\s\S]*?<w:t xml:space="preserve"> atas persetujuan kedua belah pihak\.<\/w:t><\/w:r>/,
    [
      wRun('Bahwa perjanjian kerja ini diadakan dari tanggal '),
      wRun('{{contract_start_date}}', true),
      wRun(' s/d '),
      wRun('{{contract_end_date}}', true),
      wRun(' atas persetujuan kedua belah pihak.'),
    ].join(''),
  );

  output = output.replace(
    'upah Rp13.000,00 (Tiga Belas Ribu Rupiah) per jam jika dilakukan pada hari kerja, atau Rp15.000,00 (Lima Belas Ribu Rupiah) jika dilakukan pada non-hari kerja.',
    'upah {{overtime_workday_rate}} per jam jika dilakukan pada hari kerja, atau {{overtime_holiday_rate}} jika dilakukan pada non-hari kerja.',
  );
  output = output.replace('<w:t>Hari {{letter_day}} s/d Jumat</w:t>', '<w:t>Hari Senin s/d Jumat</w:t>');
  output = output.replace(
    '<w:t>{{pasal_8_point_b_text}}</w:t>',
    '<w:t>Bonus tergantung peraturan perusahaan dan penilaian performansi</w:t>',
  );
  output = output.replace(
    '<w:t>Makan siang per hari sebesar {{meal_allowance}}</w:t>',
    '<w:t>Uang makan per hari sebesar {{meal_allowance}}</w:t>',
  );
  output = output.replace(
    /<w:t xml:space="preserve">Mengingat hasil <\/w:t>[\s\S]*?<w:t>test<\/w:t>[\s\S]*?<w:t xml:space="preserve"> penerimaan Pihak Kedua, maka upah yang diberikan adalah sebesar \{\{salary_percentage\}\} dari jumlah gaji pokok sampai ada <\/w:t>[\s\S]*?<w:t>review<\/w:t>[\s\S]*?<w:t xml:space="preserve"> bahwa Pihak Kedua sudah memenuhi penerimaan upah 100%\.<\/w:t>/,
    '<w:t>{{pasal_8_point_b_text}}</w:t>',
  );

  output = replaceInBlock(output, '<w:t>Gaji Pokok</w:t>', '<w:t>2.300.000,-</w:t>', '<w:t>{{basic_salary}}</w:t>');
  output = output.replace(
    /<w:t xml:space="preserve"> :Rp<\/w:t>[\s\S]*?<w:t>{{basic_salary}}<\/w:t>/,
    '<w:t xml:space="preserve"> : </w:t><w:t>{{basic_salary}}</w:t>',
  );
  output = replaceInBlock(
    output,
    '<w:t>Tunjangan Kesehatan</w:t>',
    '{{transport_allowance}}',
    '{{health_allowance}}',
  );
  output = replaceInBlock(
    output,
    '<w:t>Tunjangan Operasional</w:t>',
    '{{transport_allowance}}',
    '{{operational_allowance}}',
  );

  return applyKk01PaginationRules(output);
};

const templates = [
  {
    source: '/Users/syilla/Downloads/006_KK_Achmad Hendarsyah.docx',
    output: 'kontrak-kerja-karyawan.docx',
    replacements: [
      ['NW-006/KK.01/HCM/I/2026', '{{letter_number}}'],
      ['Senin', '{{letter_day}}'],
      ['Dua Puluh Enam bulan Januari tahun Dua Ribu Dua Puluh Enam', '{{letter_date_text}}'],
      ['PT Neuronworks Indonesia', '{{company_name}}'],
      ['Komplek Buah Batu Regency No 9-10 Blok A2, Kujangsari Bandung', '{{company_address}}'],
      ['Sriyanto', '{{signer_name}}'],
      ['Direktur', '{{signer_position}}'],
      ['1800802001', '{{signer_nik}}'],
      ['Achmad Hendarsyah', '{{employee_name}}'],
      ['3203-0127-0495-0001', '{{employee_id_number}}'],
      ['Cianjur, 27 April 1995', '{{employee_birth_place_date}}'],
      ['Kp. Lembur Tengah Rt. 002/014 Kel. Solokpandan Kec. Cianjur', '{{employee_address}}'],
      ['26 Januari 2026', '{{contract_start_date}}'],
      ['26 Januari 2028', '{{contract_end_date}}'],
      ['Junior Programmer', '{{position}}'],
      ['Karyawan Kontrak', '{{employment_status}}'],
      ['Rp 2.300.000,-', '{{basic_salary}}'],
      ['Rp 200.000,-', '{{transport_allowance}}'],
      ['Rp 100.000,-', '{{position_allowance}}'],
      ['Rp 25.000,-', '{{communication_allowance}}'],
      ['Rp 50.000,-', '{{meal_allowance}}'],
      ['80%', '{{salary_percentage}}'],
    ],
  },
  {
    source: '/Users/syilla/Downloads/KKM - 009 - Fakhriy Dzakwan.docx',
    output: 'kontrak-kerja-magang.docx',
    replacements: [
      ['NW-009/KK.02/HCM/I/2026', '{{letter_number}}'],
      ['Senin', '{{letter_day}}'],
      ['Dua Puluh Tujuh bulan Januari, tahun Dua Ribu Dua Puluh Enam', '{{letter_date_text}}'],
      ['PT. Neuronworks Indonesia', '{{company_name}}'],
      ['Komplek Buah Batu Regency No 9-10 Blok A2, Kujangsari Bandung', '{{company_address}}'],
      ['Ryan Nurochman', '{{signer_name}}'],
      ['Human Capital Management', '{{signer_position}}'],
      ['1931710098', '{{signer_nik}}'],
      ['Fakhriy Dzakwan Alinanda Sudrajat', '{{employee_name}}'],
      ['6403-0512-0103-0002', '{{employee_id_number}}'],
      ['Berau, 12 Januari 2003', '{{employee_birth_place_date}}'],
      ['Jl. Mangga 3 Gg. Ramadhan RT. 08, Tanjung Redeb, Berau', '{{employee_address}}'],
      ['27 Januari 2026', '{{contract_start_date}}'],
      ['27 April 2026', '{{contract_end_date}}'],
      ['Quality Assurance Intern', '{{position}}'],
      ['Rp.  1.800.000,-', '{{basic_salary}}'],
      ['Rp.      35.000,-', '{{meal_transport_allowance}}'],
    ],
  },
  {
    source: '/Users/syilla/Downloads/052_KK_Dedi.docx',
    output: 'kontrak-kerja-freelancer.docx',
    replacements: [
      ['NW-052/KK.03/HCM/IV/2026', '{{letter_number}}'],
      ['Rabu', '{{letter_day}}'],
      ['Satu bulan April tahun Dua Ribu Dua Puluh Enam', '{{letter_date_text}}'],
      ['PT Neuronworks Indonesia', '{{company_name}}'],
      ['Komplek Buah Batu Regency No 9-10 Blok A2, Kujangsari Bandung', '{{company_address}}'],
      ['Sriyanto', '{{signer_name}}'],
      ['Direktur', '{{signer_position}}'],
      ['1800802001', '{{signer_nik}}'],
      ['Dedi Supriadi', '{{employee_name}}'],
      ['3204-3230-0997-0003', '{{employee_id_number}}'],
      ['Bandung, 30 September 1997', '{{employee_birth_place_date}}'],
      ['Bukit Arjasari Indah Blok C2 17, Desa Wargaluyu, Kecamatan Arjasari', '{{employee_address}}'],
      ['01 April 2026', '{{contract_start_date}}'],
      ['31 Juli 2026', '{{contract_end_date}}'],
      ['Programmer', '{{position}}'],
      ['Tenaga Pekerja Lepas', '{{employment_status}}'],
      ['Rp. 10.000.000', '{{gross_salary}}'],
      ['Rp. 250.000', '{{tax_deduction}}'],
      ['Rp. 9.750.000', '{{net_salary}}'],
      ['Laporan pekerjaan pada Modul Reconcile, Payment Warranty, Gas Deposit, Bad Debt, Late Charge, Payment Gateway, dan Master Data PGN.', '{{work_scope}}'],
    ],
  },
  {
    source: '/Users/syilla/Downloads/Offering Letter - Achmad Hendarsyah copy.docx',
    output: 'offering-letter.docx',
    replacements: [
      ['NW-004/KK.01-OL/HCM/I/2026', '{{letter_number}}'],
      ['19 Januari 2026', '{{letter_date}}'],
      ['PT Neuronworks Indonesia', '{{company_name}}'],
      ['Achmad Hendarsyah', '{{employee_name}}'],
      ['Junior Programmer', '{{position}}'],
      ['Karyawan Kontrak', '{{employment_status}}'],
      ['New Business & Leverage Segment Delivery (NEW BUSINESS)', '{{division}}'],
      ['NB - TSEL', '{{subdivision}}'],
      ['26 Januari 2026', '{{start_date}}'],
      ['Bandung', '{{placement_location}}'],
      ['2 (dua) tahun', '{{contract_period}}'],
      ['2.300.000,00', '{{basic_salary}}'],
      ['200.000,00', '{{transport_allowance}}'],
      ['100.000,00', '{{position_allowance}}'],
      ['25.000,00', '{{communication_allowance}}'],
      ['5.225.000,00', '{{total_take_home_pay}}'],
      ['Ryan Nurochman', '{{signer_name}}'],
      ['Coor. Human Capital Management', '{{signer_position}}'],
    ],
  },
];

fs.mkdirSync(outputDir, { recursive: true });

for (const template of templates) {
  if (!fs.existsSync(template.source)) {
    throw new Error(`Source DOCX not found: ${template.source}`);
  }

  const zip = new PizZip(fs.readFileSync(template.source));
  const document = zip.file('word/document.xml');
  if (!document) throw new Error(`word/document.xml not found: ${template.source}`);

  const replacedXml = replaceAll(document.asText(), template.replacements);
  const updatedXml =
    template.output === 'kontrak-kerja-karyawan.docx' ? postProcessKk01Xml(replacedXml) : replacedXml;
  zip.file('word/document.xml', updatedXml);

  const target = path.join(outputDir, template.output);
  fs.writeFileSync(target, zip.generate({ type: 'nodebuffer' }));
  console.log(`Generated ${path.relative(root, target)}`);
}
