const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

const standardContractClauses = `
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tbody>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 6</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Bahwa Pihak Kedua tidak akan mengakhiri masa kerja secara sepihak sebelum masa kontrak berakhir.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 7</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Bahwa selama perjanjian berlangsung, Pihak Kedua akan tetap melaksanakan kewajiban pekerjaan, tidak lalai, dan menjaga kinerja. Apabila Pihak Kedua melakukan kerja rangkap di perusahaan lain, maka Pihak Kedua harus menginformasikan dan mendapatkan persetujuan Pihak Pertama.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 8</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Bahwa Pihak Kedua diwajibkan menaati perintah/tugas dan peraturan-peraturan yang dikeluarkan oleh para pimpinan baik secara lisan dan/atau tertulis, dalam rangka pelaksanaan syarat-syarat dari perjanjian ini.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 9</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Bahwa Pihak Kedua dengan ini menyatakan kesediaannya untuk menaati kewajiban sebagai pekerja dan Peraturan/Tata Tertib Perusahaan yang telah ditetapkan oleh Pihak Pertama. Pelanggaran terhadap hal tersebut dapat mengakibatkan pemberhentian tanpa syarat.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 10</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Bahwa Pihak Kedua wajib menjaga kerahasiaan dan keamanan seluruh source code, dokumen, data, aset, serta informasi milik Perusahaan. Semua bentuk informasi tersebut hanya boleh digunakan untuk kepentingan pekerjaan dan dilarang dipakai untuk tujuan pribadi maupun pihak lain tanpa izin resmi dari Perusahaan.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 11</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Dalam hal terjadi berakhirnya masa pelaksanaan pekerjaan, Pihak Kedua wajib mengembalikan seluruh aset, fasilitas, dokumen, akses, dan informasi rahasia milik Perusahaan serta dilarang menyimpan, menggunakan, atau memanfaatkan informasi tersebut untuk kepentingan pribadi atau pihak lain.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 12</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 15px;">Segala ketentuan yang belum tercantum di dalam perjanjian ini akan diatur kemudian sesuai kesepakatan kedua belah pihak.</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-bottom: 30px;">Demikian surat perjanjian ini dibuat dengan sebenar-benarnya dalam rangkap 2 (dua) dan mempunyai kekuatan hukum yang sama, tanpa ada paksaan dari pihak manapun.</td>
    </tr>
  </tbody>
</table>

<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 20px;">
  <tbody>
    <tr>
      <td style="width: 50%; padding-bottom: 80px;">PIHAK PERTAMA</td>
      <td style="width: 50%; padding-bottom: 80px;">PIHAK KEDUA</td>
    </tr>
    <tr>
      <td style="width: 50%;"><strong>{{signer_name}}</strong><br>{{signer_position}}<br>NIK. {{signer_nik}}</td>
      <td style="width: 50%;"><strong>{{employee_name}}</strong></td>
    </tr>
  </tbody>
</table>
`.trim();

// Add logic to replace the old standardContractClauses
seed = seed.replace(/const standardContractClauses = `[\s\S]*?`\.trim\(\);/, 'const standardContractClauses = `' + standardContractClauses + '`.trim();');

// 1. KK Karyawan
let kk1 = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px;">K O N T R A K   K E R J A</td>
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
    <tr><td colspan="2" style="padding-bottom: 15px;">Perjanjian kerja ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak. Pihak Pertama dapat melakukan evaluasi prestasi dan kondisi kerja Pihak Kedua sebagai dasar kelanjutan hubungan kerja.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 2</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Kedua setuju terhadap waktu kerja yang telah ditetapkan oleh Pihak Pertama:</td></tr>
    <tr><td style="width: 30%; padding-left: 20px;">Hari Senin s/d Jumat</td><td style="width: 70%;">: {{work_hour}}</td></tr>
    <tr><td style="padding-left: 20px;">Istirahat</td><td>: {{break_hour}}</td></tr>
    <tr><td style="padding-left: 20px; padding-bottom: 15px;">Hari Sabtu</td><td style="padding-bottom: 15px;">: {{saturday_policy}}</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 3</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Pertama berkewajiban memberikan tugas/job description, membayar upah sesuai perjanjian, memotong dan menyetorkan PPh 21, serta menaati peraturan perusahaan.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua berkewajiban melaksanakan tugas dengan penuh tanggung jawab, menjaga nama baik perusahaan, memelihara aset perusahaan, menjaga suasana kerja yang baik, dan bersedia ditempatkan sesuai kebutuhan perusahaan.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 4</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Pertama menempatkan Pihak Kedua pada posisi <strong>{{position}}</strong> dengan status <strong>{{employment_status}}</strong>.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 5</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:</td></tr>
    <tr><td style="width: 30%; padding-left: 20px;">Gaji Pokok</td><td style="width: 70%;">: {{basic_salary}}</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Transportasi</td><td>: {{transport_allowance}}</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Kesehatan</td><td>: {{health_allowance}}</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Jabatan</td><td>: {{position_allowance}}</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Komunikasi</td><td>: {{communication_allowance}}</td></tr>
    <tr><td style="padding-left: 20px;">Tunjangan Operasional</td><td>: {{operational_allowance}}</td></tr>
    <tr><td style="padding-left: 20px; padding-bottom: 10px;">Makan siang per hari</td><td style="padding-bottom: 10px;">: {{meal_allowance}}</td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Upah yang diberikan adalah sebesar {{salary_percentage}} dari jumlah gaji pokok sampai terdapat review penerimaan upah penuh.</td></tr>
  </tbody>
</table>
\${standardContractClauses}
`;

// Replace the KK1 template content string in seed
seed = seed.replace(/categoryCode: 'KK\.01',[\s\S]*?content: `[\s\S]*?`\.trim\(\),/, "categoryCode: 'KK.01',\n    numberingFormat: 'NW-{{sequence}}/KK.01/HCM/{{roman_month}}/{{year}}',\n    templateName: 'Template Kontrak Kerja Karyawan',\n    placeholders: [\n      'letter_number',\n      'letter_day',\n      'letter_date_text',\n      'signer_name',\n      'signer_position',\n      'signer_nik',\n      'company_name',\n      'company_address',\n      'employee_name',\n      'employee_id_number',\n      'employee_birth_place_date',\n      'employee_address',\n      'contract_start_date',\n      'contract_end_date',\n      'work_hour',\n      'break_hour',\n      'saturday_policy',\n      'position',\n      'employment_status',\n      'basic_salary',\n      'transport_allowance',\n      'health_allowance',\n      'position_allowance',\n      'communication_allowance',\n      'operational_allowance',\n      'meal_allowance',\n      'salary_percentage',\n    ],\n    content: `" + kk1.trim() + "`,\n");

fs.writeFileSync('prisma/seed.ts', seed);
