const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

let kk3 = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px;">K O N T R A K   K E R J A   F R E E L A N C E R</td>
    </tr>
    <tr>
      <td style="font-size: 11pt;">Nomor : {{letter_number}}</td>
    </tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr>
      <td style="padding-bottom: 10px;">Pada hari ini, {{letter_day}} tanggal {{letter_date_text}}, kami yang bertanda tangan di bawah ini:</td>
    </tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 5%; vertical-align: top;">1.</td><td style="width: 25%; vertical-align: top;">Nama</td><td style="width: 5%; vertical-align: top;">:</td><td style="width: 65%; vertical-align: top;"><strong>{{signer_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">Jabatan</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_position}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">NIK</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{signer_nik}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 10px;">Dalam hal ini bertindak untuk dan atas nama <strong>{{company_name}}</strong> yang beralamat di {{company_address}}, selanjutnya disebut <strong>Pihak Pertama / Perusahaan</strong>.</td></tr>
    <tr><td style="vertical-align: top;">2.</td><td style="vertical-align: top;">Nama</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;"><strong>{{employee_name}}</strong></td></tr>
    <tr><td></td><td style="vertical-align: top;">No. KTP</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_id_number}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Tempat / Tgl Lahir</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_birth_place_date}}</td></tr>
    <tr><td></td><td style="vertical-align: top;">Alamat</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">{{employee_address}}</td></tr>
    <tr><td colspan="4" style="padding-top: 10px; padding-bottom: 15px;">Selanjutnya disebut <strong>Pihak Kedua</strong>.</td></tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
  <tbody>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 1</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Perjanjian kerja ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 2</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Pertama berkewajiban memberikan tugas/job description, membayar upah, memotong dan menyetorkan PPh 21, serta menaati peraturan perusahaan.<br><br>Pihak Kedua berkewajiban melaksanakan tugas, menjaga nama baik perusahaan, memelihara aset perusahaan, dan menjaga suasana kerja yang baik.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 3</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Pertama menempatkan Pihak Kedua pada posisi <strong>{{position}}</strong> dengan status <strong>Freelancer</strong>.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 4</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:</td></tr>
    <tr><td style="width: 30%; padding-left: 20px; padding-bottom: 15px;">Gaji Pokok</td><td style="width: 70%; padding-bottom: 15px;">: {{basic_salary}}/Bulan</td></tr>
  </tbody>
</table>
\${standardContractClauses}
`;

seed = seed.replace(/categoryCode: 'KK\.03',[\s\S]*?content: `[\s\S]*?`\.trim\(\),/, "categoryCode: 'KK.03',\n    numberingFormat: 'NW-{{sequence}}/KK.03/HCM/{{roman_month}}/{{year}}',\n    templateName: 'Template Kontrak Kerja Freelancer',\n    placeholders: [\n      'letter_number',\n      'letter_day',\n      'letter_date_text',\n      'signer_name',\n      'signer_position',\n      'signer_nik',\n      'company_name',\n      'company_address',\n      'employee_name',\n      'employee_id_number',\n      'employee_birth_place_date',\n      'employee_address',\n      'contract_start_date',\n      'contract_end_date',\n      'position',\n      'basic_salary',\n    ],\n    content: `" + kk3.trim() + "`,\n");

fs.writeFileSync('prisma/seed.ts', seed);
