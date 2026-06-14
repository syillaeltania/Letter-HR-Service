import { PrismaClient, TemplateStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const globalNumberingPlaceholders = [
  'letter_sequence',
  'letter_number',
  'letter_category_code',
  'letter_type_code',
  'letter_month_roman',
  'letter_year',
  'letter_date',
];

const standardContractClauses = `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
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
</table>`.trim();
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
</table>
`.trim();

const templates = [
  {
    categoryName: 'Kontrak Kerja',
    categoryCode: 'KK',
    letterTypeName: 'Kontrak Kerja Karyawan',
    letterTypeCode: 'KK.01',
    numberingFormat: 'NW-{{sequence}}/KK.01/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Karyawan',
    placeholders: [
      'letter_number',
      'letter_day',
      'letter_date_text',
      'signer_name',
      'signer_position',
      'signer_nik',
      'company_name',
      'company_address',
      'employee_name',
      'employee_id_number',
      'employee_birth_place_date',
      'employee_address',
      'contract_start_date',
      'contract_end_date',
      'work_hour',
      'break_hour',
      'saturday_policy',
      'position',
      'employment_status',
      'basic_salary',
      'transport_allowance',
      'health_allowance',
      'position_allowance',
      'communication_allowance',
      'operational_allowance',
      'meal_allowance',
      'salary_percentage',
    ],
    content: `<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
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
${standardContractClauses}`,

  },
  {
    categoryName: 'Kontrak Kerja',
    categoryCode: 'KK',
    letterTypeName: 'Kontrak Kerja Magang',
    letterTypeCode: 'KK.02',
    numberingFormat: 'NW-{{sequence}}/KK.02/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Magang',
    placeholders: [
      'letter_number',
      'letter_day',
      'letter_date_text',
      'signer_name',
      'signer_position',
      'signer_nik',
      'company_name',
      'company_address',
      'employee_name',
      'employee_id_number',
      'employee_birth_place_date',
      'employee_address',
      'contract_start_date',
      'contract_end_date',
      'work_hour',
      'break_hour',
      'saturday_policy',
      'latest_arrival_time',
      'daily_work_duration',
      'position',
      'basic_salary',
      'meal_transport_allowance',
    ],
    content: `<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
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
</table>`,

  },
  {
    categoryName: 'Kontrak Kerja',
    categoryCode: 'KK',
    letterTypeName: 'Kontrak Kerja Pekerja Lepas',
    letterTypeCode: 'KK.03',
    numberingFormat: 'NW-{{sequence}}/KK.03/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Freelancer',
    placeholders: [
      'letter_number',
      'letter_day',
      'letter_date_text',
      'signer_name',
      'signer_position',
      'signer_nik',
      'company_name',
      'company_address',
      'employee_name',
      'employee_id_number',
      'employee_birth_place_date',
      'employee_address',
      'contract_start_date',
      'contract_end_date',
      'position',
      'basic_salary',
    ],
    content: `<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
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
${standardContractClauses}`,

  },
  {
    categoryName: 'Kontrak Kerja',
    categoryCode: 'KK',
    letterTypeName: 'Offering Letter',
    letterTypeCode: 'KK.01-OL',
    numberingFormat: 'NW-{{sequence}}/KK.01-OL/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Offering Letter',
    placeholders: [
      'letter_number',
      'candidate_name',
      'position',
      'employment_status',
      'basic_salary',
      'fixed_allowance',
      'start_work_date',
      'signer_name',
      'signer_position',
    ],
    content: `<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
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
</table>`,

  },
];

async function main() {
  const password = await bcrypt.hash('ChangeMe123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin.hr@example.com' },
    update: {},
    create: {
      name: 'Admin HR',
      email: 'admin.hr@example.com',
      password,
      role: UserRole.ADMIN_HR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'approver.hr@example.com' },
    update: {},
    create: {
      name: 'Approver HR',
      email: 'approver.hr@example.com',
      password,
      role: UserRole.APPROVER,
    },
  });

  for (const template of templates) {
    const category = await prisma.letterCategory.upsert({
      where: { categoryCode: template.categoryCode },
      update: {
        categoryName: template.categoryName,
        numberingFormat: template.numberingFormat,
        isActive: true,
      },
      create: {
        categoryName: template.categoryName,
        categoryCode: template.categoryCode,
        numberingFormat: template.numberingFormat,
        isActive: true,
      },
    });

    let letterType = null;
    if (template.letterTypeCode) {
      letterType = await prisma.letterType.upsert({
        where: { categoryId_typeCode: { categoryId: category.id, typeCode: template.letterTypeCode } },
        update: {
          typeName: template.letterTypeName,
          isActive: true,
        },
        create: {
          typeName: template.letterTypeName,
          typeCode: template.letterTypeCode,
          categoryId: category.id,
          isActive: true,
        },
      });
    }

    await prisma.letterTemplate.upsert({
      where: {
        categoryId_templateName_version: {
          categoryId: category.id,
          templateName: template.templateName,
          version: 1,
        },
      },
      update: {
        letterTypeId: letterType ? letterType.id : null,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        status: TemplateStatus.ACTIVE,
      },
      create: {
        categoryId: category.id,
        letterTypeId: letterType ? letterType.id : null,
        templateName: template.templateName,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        version: 1,
        status: TemplateStatus.ACTIVE,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
