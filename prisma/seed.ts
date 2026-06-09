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

const standardContractClauses = `
Pasal 6
Bahwa Pihak Kedua tidak akan mengakhiri masa kerja secara sepihak sebelum masa kontrak berakhir.

Pasal 7
Bahwa selama perjanjian berlangsung, Pihak Kedua akan tetap melaksanakan kewajiban pekerjaan, tidak lalai, dan menjaga kinerja. Apabila Pihak Kedua melakukan kerja rangkap di perusahaan lain, maka Pihak Kedua harus menginformasikan dan mendapatkan persetujuan Pihak Pertama.

Pasal 8
Bahwa Pihak Kedua diwajibkan menaati perintah/tugas dan peraturan-peraturan yang dikeluarkan oleh para pimpinan baik secara lisan dan/atau tertulis, dalam rangka pelaksanaan syarat-syarat dari perjanjian ini.

Pasal 9
Bahwa Pihak Kedua dengan ini menyatakan kesediaannya untuk menaati kewajiban sebagai pekerja dan Peraturan/Tata Tertib Perusahaan yang telah ditetapkan oleh Pihak Pertama. Pelanggaran terhadap hal tersebut dapat mengakibatkan pemberhentian tanpa syarat.

Pasal 10
Bahwa Pihak Kedua wajib menjaga kerahasiaan dan keamanan seluruh source code, dokumen, data, aset, serta informasi milik Perusahaan. Semua bentuk informasi tersebut hanya boleh digunakan untuk kepentingan pekerjaan dan dilarang dipakai untuk tujuan pribadi maupun pihak lain tanpa izin resmi dari Perusahaan.

Pasal 11
Dalam hal terjadi berakhirnya masa pelaksanaan pekerjaan, Pihak Kedua wajib mengembalikan seluruh aset, fasilitas, dokumen, akses, dan informasi rahasia milik Perusahaan serta dilarang menyimpan, menggunakan, atau memanfaatkan informasi tersebut untuk kepentingan pribadi atau pihak lain.

Pasal 12
Segala ketentuan yang belum tercantum di dalam perjanjian ini akan diatur kemudian sesuai kesepakatan kedua belah pihak.

Demikian surat perjanjian ini dibuat dengan sebenar-benarnya dalam rangkap 2 (dua) dan mempunyai kekuatan hukum yang sama, tanpa ada paksaan dari pihak manapun.

PIHAK PERTAMA

{{signer_name}}
{{signer_position}}
NIK. {{signer_nik}}


PIHAK KEDUA

{{employee_name}}
`.trim();

const templates = [
  {
    categoryName: 'Kontrak Kerja Karyawan',
    categoryCode: 'KK.01',
    numberingFormat: 'NW-{{sequence}}/KK.01/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Karyawan',
    docxTemplatePath: 'templates/docx/kontrak-kerja-karyawan.docx',
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
    content: `
K O N T R A K   K E R J A
Nomor : {{letter_number}}

Pada hari ini, {{letter_day}} tanggal {{letter_date_text}}, kami yang bertanda tangan di bawah ini:

Nama    : {{signer_name}}
Jabatan : {{signer_position}}
NIK     : {{signer_nik}}

Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}, selanjutnya disebut Pihak Pertama / Perusahaan.

Nama                 : {{employee_name}}
No. KTP              : {{employee_id_number}}
Tempat / Tgl Lahir   : {{employee_birth_place_date}}
Alamat               : {{employee_address}}

Selanjutnya disebut Pihak Kedua.

Pasal 1
Perjanjian kerja ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak. Pihak Pertama dapat melakukan evaluasi prestasi dan kondisi kerja Pihak Kedua sebagai dasar kelanjutan hubungan kerja.

Pasal 2
Pihak Kedua setuju terhadap waktu kerja yang telah ditetapkan oleh Pihak Pertama:
Hari Senin s/d Jumat : {{work_hour}}
Istirahat            : {{break_hour}}
Hari Sabtu           : {{saturday_policy}}

Pasal 3
Pihak Pertama berkewajiban memberikan tugas/job description, membayar upah sesuai perjanjian, memotong dan menyetorkan PPh 21, serta menaati peraturan perusahaan.

Pihak Kedua berkewajiban melaksanakan tugas dengan penuh tanggung jawab, menjaga nama baik perusahaan, memelihara aset perusahaan, menjaga suasana kerja yang baik, dan bersedia ditempatkan sesuai kebutuhan perusahaan.

Pasal 4
Pihak Pertama menempatkan Pihak Kedua pada posisi {{position}} dengan status {{employment_status}}.

Pasal 5
Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:
Gaji Pokok              : {{basic_salary}}
Tunjangan Transportasi  : {{transport_allowance}}
Tunjangan Kesehatan     : {{health_allowance}}
Tunjangan Jabatan       : {{position_allowance}}
Tunjangan Komunikasi    : {{communication_allowance}}
Tunjangan Operasional   : {{operational_allowance}}
Makan siang per hari    : {{meal_allowance}}

Upah yang diberikan adalah sebesar {{salary_percentage}} dari jumlah gaji pokok sampai terdapat review penerimaan upah penuh.

${standardContractClauses}
`.trim(),
  },
  {
    categoryName: 'Kontrak Kerja Magang',
    categoryCode: 'KK.02',
    numberingFormat: 'NW-{{sequence}}/KK.02/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Magang',
    docxTemplatePath: 'templates/docx/kontrak-kerja-magang.docx',
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
    content: `
K O N T R A K   K E R J A   M A G A N G
Nomor : {{letter_number}}

Pada hari ini, {{letter_day}} tanggal {{letter_date_text}}, kami yang bertanda tangan di bawah ini:

Nama    : {{signer_name}}
Jabatan : {{signer_position}}
NIK     : {{signer_nik}}

Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}, selanjutnya disebut Pihak Pertama / Perusahaan.

Nama                 : {{employee_name}}
No. KTP              : {{employee_id_number}}
Tempat / Tgl Lahir   : {{employee_birth_place_date}}
Alamat               : {{employee_address}}

Selanjutnya disebut Pihak Kedua.

Pasal 1
Perjanjian kerja magang ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak.

Pasal 2
Pihak Kedua setuju terhadap waktu kerja yang telah ditetapkan oleh Pihak Pertama:
Hari Senin s/d Jumat : {{work_hour}}
Istirahat            : {{break_hour}}
Hari Sabtu           : {{saturday_policy}}

Pasal 3
Pihak Kedua datang selambat-lambatnya pukul {{latest_arrival_time}} dengan jumlah jam kerja {{daily_work_duration}}.

Pasal 4
Pihak Pertama berkewajiban memberikan tugas/job description, membayar imbalan/upah sesuai perjanjian, dan menaati peraturan perusahaan.

Pihak Kedua berkewajiban melaksanakan tugas dengan penuh tanggung jawab, menjaga suasana kerja yang baik, menggunakan barang milik perusahaan dengan sebaik-baiknya, dan bersedia ditempatkan sesuai kebutuhan perusahaan.

Pasal 5
Pihak Kedua berhak mendapatkan tugas sesuai posisinya, upah transport dan makan, serta waktu dan hari istirahat kerja.

Pasal 6
Pihak Pertama menempatkan Pihak Kedua pada bagian {{position}} dengan status Peserta Magang.

Pasal 7
Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:
Gaji Pokok              : {{basic_salary}}/Bulan
Uang Makan & Transport  : {{meal_transport_allowance}}/Hari

Pasal 8
Pihak Kedua wajib menaati perintah/tugas dan peraturan yang dikeluarkan pimpinan baik secara lisan dan/atau tertulis.

Pasal 9
Pihak Kedua tidak akan mempergunakan source code program dan dokumen milik perusahaan untuk kepentingan sendiri atau pihak lain tanpa sepengetahuan perusahaan.

Pasal 10
Perjanjian kerja ini batal demi hukum bila Pihak Kedua meninggal dunia, dapat dibatalkan karena tindakan Pemerintah atau bencana alam, atau dibatalkan oleh Pihak Pertama apabila Pihak Kedua melakukan kesalahan berat.

Pasal 11
Segala ketentuan yang belum tercantum di dalam perjanjian ini akan diatur kemudian sesuai kesepakatan kedua belah pihak.

Demikian surat perjanjian ini dibuat dengan sebenar-benarnya dalam rangkap 2 (dua) dan mempunyai kekuatan hukum yang sama, tanpa ada paksaan dari pihak manapun.

PIHAK PERTAMA

{{signer_name}}
{{signer_position}}


PIHAK KEDUA

{{employee_name}}
`.trim(),
  },
  {
    categoryName: 'Kontrak Kerja Freelancer',
    categoryCode: 'KK.03',
    numberingFormat: 'NW-{{sequence}}/KK.03/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Kontrak Kerja Freelancer',
    docxTemplatePath: 'templates/docx/kontrak-kerja-freelancer.docx',
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
      'project_name',
      'work_scope',
      'gross_salary',
      'tax_deduction',
      'net_salary',
      'bonus_terms',
      'payment_terms',
    ],
    content: `
K O N T R A K   K E R J A
Nomor : {{letter_number}}

Pada hari ini, {{letter_day}} tanggal {{letter_date_text}}, kami yang bertanda tangan di bawah ini:

Nama    : {{signer_name}}
Jabatan : {{signer_position}}
NIK     : {{signer_nik}}

Dalam hal ini bertindak untuk dan atas nama {{company_name}} yang beralamat di {{company_address}}, selanjutnya disebut Pihak Pertama / Perusahaan.

Nama                 : {{employee_name}}
No. KTP              : {{employee_id_number}}
Tempat / Tgl Lahir   : {{employee_birth_place_date}}
Alamat               : {{employee_address}}

Selanjutnya disebut Pihak Kedua.

Pasal 1
Perjanjian kerja ini diadakan dari tanggal {{contract_start_date}} sampai dengan {{contract_end_date}} atas persetujuan kedua belah pihak.

Pasal 2
Pihak Pertama berkewajiban memberikan tugas/job description, membayar imbalan jasa/upah sesuai perjanjian, memotong dan menyetorkan PPh 21, serta menaati peraturan perusahaan.

Pihak Kedua berkewajiban melaksanakan tugas dengan penuh tanggung jawab, menjaga nama baik perusahaan, menjaga aset perusahaan, bersedia ditempatkan sesuai kebutuhan perusahaan, dan memastikan seluruh proses delivery proyek {{project_name}} terlaksana sesuai target serta standar kualitas yang disepakati.

Pasal 3
Pihak Kedua berhak mendapatkan tugas sesuai posisinya, imbalan sesuai kesepakatan, dan pembelaan hukum dari perusahaan dalam rangka menjalankan tugas yang diberikan perusahaan sesuai ketentuan berlaku.

Pasal 4
Pihak Pertama menempatkan Pihak Kedua dengan posisi {{position}} dengan status Tenaga Pekerja Lepas.

Pasal 5
Pihak Pertama memberikan upah kepada Pihak Kedua dengan rincian:
Gaji Pokok / Upah Bruto : {{gross_salary}}
Potongan PPh            : {{tax_deduction}}
Total Diterima          : {{net_salary}}
Bonus                   : {{bonus_terms}}

Ketentuan pembayaran:
{{payment_terms}}

Ruang lingkup pekerjaan:
{{work_scope}}

${standardContractClauses}
`.trim(),
  },
  {
    categoryName: 'Offering Letter',
    categoryCode: 'KK.01-OL',
    numberingFormat: 'NW-{{sequence}}/KK.01-OL/HCM/{{roman_month}}/{{year}}',
    templateName: 'Template Offering Letter',
    docxTemplatePath: 'templates/docx/offering-letter.docx',
    placeholders: [
      'letter_number',
      'letter_date',
      'company_name',
      'employee_name',
      'position',
      'employment_status',
      'division',
      'subdivision',
      'start_date',
      'placement_location',
      'contract_period',
      'basic_salary',
      'transport_allowance',
      'health_allowance',
      'position_allowance',
      'communication_allowance',
      'operational_allowance',
      'meal_allowance',
      'total_take_home_pay',
      'benefits',
      'signer_name',
      'signer_position',
    ],
    content: `
Nomor  : {{letter_number}}
Bandung, {{letter_date}}
Perihal: Penawaran dan Persetujuan Kerja

Kepada Yth.,
Sdr. {{employee_name}}
Di Tempat

Dengan hormat,

Menindaklanjuti proses rekrutmen Saudara di {{company_name}}, kami sampaikan rincian penawaran sebagai berikut:

Posisi                  : {{position}}
Status Kontrak Kerja    : {{employment_status}}
Divisi                  : {{division}}
Bagian/Subdivisi        : {{subdivision}}
Tanggal Mulai Bekerja   : {{start_date}}
Lokasi Penempatan       : {{placement_location}}
Periode Kontrak         : {{contract_period}}

Kompensasi:
Gaji Pokok              : {{basic_salary}}
Tunjangan Transportasi  : {{transport_allowance}}
Tunjangan Kesehatan     : {{health_allowance}}
Tunjangan Jabatan       : {{position_allowance}}
Tunjangan Komunikasi    : {{communication_allowance}}
Tunjangan Operasional   : {{operational_allowance}}
Uang Makan              : {{meal_allowance}}
TOTAL GAJI DITERIMA     : {{total_take_home_pay}}

Fasilitas/Benefit:
{{benefits}}

Demikian hal ini kami sampaikan. Saudara dimohon untuk dapat memberikan konfirmasi persetujuan atas penawaran tersebut.

{{signer_position}}

{{signer_name}}


FORMULIR PERSETUJUAN

Kepada Yth.,
{{signer_position}}
{{company_name}}

Dengan hormat,

Merujuk pada surat penawaran kerja dari {{company_name}} Nomor: {{letter_number}} tanggal {{letter_date}}, dengan ini saya menyatakan SETUJU / TIDAK SETUJU *) atas penawaran yang disampaikan dan bersedia bergabung untuk bekerja terhitung mulai tanggal {{start_date}} atau sesuai persetujuan dari perusahaan.

Demikian hal ini saya sampaikan secara sadar dan tanpa paksaan dari pihak manapun.

.................., ...... ...................... ...........

{{employee_name}}

Catatan:
*) Coret yang tidak sesuai
`.trim(),
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

    await prisma.letterTemplate.upsert({
      where: {
        categoryId_templateName_version: {
          categoryId: category.id,
          templateName: template.templateName,
          version: 1,
        },
      },
      update: {
        templateContent: template.content,
        docxTemplatePath: template.docxTemplatePath,
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        status: TemplateStatus.ACTIVE,
      },
      create: {
        categoryId: category.id,
        templateName: template.templateName,
        templateContent: template.content,
        docxTemplatePath: template.docxTemplatePath,
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
