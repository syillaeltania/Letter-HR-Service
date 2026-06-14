const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

let ol = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px;">O F F E R I N G   L E T T E R</td>
    </tr>
    <tr>
      <td style="font-size: 11pt;">Nomor : {{letter_number}}</td>
    </tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr>
      <td style="padding-bottom: 10px;">Kepada Yth. <strong>{{candidate_name}}</strong><br>Di Tempat</td>
    </tr>
    <tr>
      <td style="padding-bottom: 10px;">Dengan hormat,</td>
    </tr>
    <tr>
      <td style="padding-bottom: 10px; text-align: justify;">Merujuk pada hasil evaluasi rekrutmen yang telah dilakukan, kami menginformasikan bahwa Anda dinyatakan lulus untuk mengisi posisi <strong>{{position}}</strong> di perusahaan kami.</td>
    </tr>
    <tr>
      <td style="padding-bottom: 10px; text-align: justify;">Berikut ini adalah rincian penawaran kompensasi yang akan Anda terima:</td>
    </tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 30%; padding-left: 20px;">Posisi</td><td style="width: 5%;">:</td><td style="width: 65%;"><strong>{{position}}</strong></td></tr>
    <tr><td style="padding-left: 20px;">Status Karyawan</td><td>:</td><td>{{employment_status}}</td></tr>
    <tr><td style="padding-left: 20px;">Gaji Pokok</td><td>:</td><td>{{basic_salary}}/Bulan</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Tetap</td><td>:</td><td>{{fixed_allowance}}</td></tr>
    <tr><td style="padding-left: 20px; padding-bottom: 10px;">Tanggal Mulai Kerja</td><td style="padding-bottom: 10px;">:</td><td style="padding-bottom: 10px;">{{start_work_date}}</td></tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr>
      <td style="padding-bottom: 10px; text-align: justify;">Apabila Anda menyetujui penawaran ini, mohon agar dapat menandatangani surat ini dan mengembalikannya kepada kami paling lambat 3 (tiga) hari setelah surat ini diterima.</td>
    </tr>
    <tr>
      <td style="padding-bottom: 10px; text-align: justify;">Demikian surat penawaran ini kami sampaikan. Kami menantikan kehadiran Anda untuk bergabung dan berkembang bersama PT Neuronworks Indonesia.</td>
    </tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 20px;">
  <tbody>
    <tr>
      <td style="width: 50%; padding-bottom: 80px;">PIHAK PERUSAHAAN</td>
      <td style="width: 50%; padding-bottom: 80px;">KANDIDAT</td>
    </tr>
    <tr>
      <td style="width: 50%;"><strong>{{signer_name}}</strong><br>{{signer_position}}</td>
      <td style="width: 50%;"><strong>{{candidate_name}}</strong></td>
    </tr>
  </tbody>
</table>
`;

seed = seed.replace(/categoryCode: 'KK\.01-OL',[\s\S]*?content: `[\s\S]*?`\.trim\(\),/, "categoryCode: 'KK.01-OL',\n    numberingFormat: 'NW-{{sequence}}/KK.01-OL/HCM/{{roman_month}}/{{year}}',\n    templateName: 'Template Offering Letter',\n    placeholders: [\n      'letter_number',\n      'candidate_name',\n      'position',\n      'employment_status',\n      'basic_salary',\n      'fixed_allowance',\n      'start_work_date',\n      'signer_name',\n      'signer_position',\n    ],\n    content: `" + ol.trim() + "`,\n");

fs.writeFileSync('prisma/seed.ts', seed);
