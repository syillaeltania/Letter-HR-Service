const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

let kk2 = `
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="font-size: 14pt; font-weight: bold; text-decoration: underline; letter-spacing: 2px;">K O N T R A K   K E R J A   M A G A N G</td>
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
    <tr><td colspan="2" style="padding-bottom: 15px;">Perjanjian kerja magang ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 2</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Kedua setuju terhadap waktu kerja yang telah ditetapkan oleh Pihak Pertama:</td></tr>
    <tr><td style="width: 30%; padding-left: 20px;">Hari Senin s/d Jumat</td><td style="width: 70%;">: {{work_hour}}</td></tr>
    <tr><td style="padding-left: 20px;">Istirahat</td><td>: {{break_hour}}</td></tr>
    <tr><td style="padding-left: 20px; padding-bottom: 15px;">Hari Sabtu</td><td style="padding-bottom: 15px;">: {{saturday_policy}}</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 3</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua datang selambat-lambatnya pukul {{latest_arrival_time}} dengan jumlah jam kerja {{daily_work_duration}}.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 4</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Pertama berkewajiban memberikan tugas/job description, membayar imbalan/upah sesuai perjanjian, dan menaati peraturan perusahaan.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua berkewajiban melaksanakan tugas dengan penuh tanggung jawab, menjaga suasana kerja yang baik, menggunakan barang milik perusahaan dengan sebaik-baiknya, dan bersedia ditempatkan sesuai kebutuhan perusahaan.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 5</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua berhak mendapatkan tugas sesuai posisinya, upah transport dan makan, serta waktu dan hari istirahat kerja.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 6</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Pertama menempatkan Pihak Kedua pada bagian <strong>{{position}}</strong> dengan status Peserta Magang.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 7</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;">Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:</td></tr>
    <tr><td style="width: 30%; padding-left: 20px;">Gaji Pokok</td><td style="width: 70%;">: {{basic_salary}}/Bulan</td></tr>
    <tr><td style="padding-left: 20px; padding-bottom: 15px;">Uang Makan & Transport</td><td style="padding-bottom: 15px;">: {{meal_transport_allowance}}/Hari</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 8</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua wajib menaati perintah/tugas dan peraturan yang dikeluarkan pimpinan baik secara lisan dan/atau tertulis.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 9</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Pihak Kedua tidak akan mempergunakan source code program dan dokumen milik perusahaan untuk kepentingan sendiri atau pihak lain tanpa sepengetahuan perusahaan.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 10</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Perjanjian kerja ini batal demi hukum bila Pihak Kedua meninggal dunia, dapat dibatalkan karena tindakan Pemerintah atau bencana alam, atau dibatalkan oleh Pihak Pertama apabila Pihak Kedua melakukan kesalahan berat.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 5px;"><strong>Pasal 11</strong></td></tr>
    <tr><td colspan="2" style="padding-bottom: 15px;">Segala ketentuan yang belum tercantum di dalam perjanjian ini akan diatur kemudian sesuai kesepakatan kedua belah pihak.</td></tr>
    <tr><td colspan="2" style="padding-bottom: 30px;">Demikian surat perjanjian ini dibuat dengan sebenar-benarnya dalam rangkap 2 (dua) dan mempunyai kekuatan hukum yang sama, tanpa ada paksaan dari pihak manapun.</td></tr>
  </tbody>
</table>
<table style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 20px;">
  <tbody>
    <tr>
      <td style="width: 50%; padding-bottom: 80px;">PIHAK PERTAMA</td>
      <td style="width: 50%; padding-bottom: 80px;">PIHAK KEDUA</td>
    </tr>
    <tr>
      <td style="width: 50%;"><strong>{{signer_name}}</strong><br>{{signer_position}}</td>
      <td style="width: 50%;"><strong>{{employee_name}}</strong></td>
    </tr>
  </tbody>
</table>
`;

seed = seed.replace(/categoryCode: 'KK\.02',[\s\S]*?content: `[\s\S]*?`\.trim\(\),/, "categoryCode: 'KK.02',\n    numberingFormat: 'NW-{{sequence}}/KK.02/HCM/{{roman_month}}/{{year}}',\n    templateName: 'Template Kontrak Kerja Magang',\n    placeholders: [\n      'letter_number',\n      'letter_day',\n      'letter_date_text',\n      'signer_name',\n      'signer_position',\n      'signer_nik',\n      'company_name',\n      'company_address',\n      'employee_name',\n      'employee_id_number',\n      'employee_birth_place_date',\n      'employee_address',\n      'contract_start_date',\n      'contract_end_date',\n      'work_hour',\n      'break_hour',\n      'saturday_policy',\n      'latest_arrival_time',\n      'daily_work_duration',\n      'position',\n      'basic_salary',\n      'meal_transport_allowance',\n    ],\n    content: `" + kk2.trim() + "`,\n");

fs.writeFileSync('prisma/seed.ts', seed);
