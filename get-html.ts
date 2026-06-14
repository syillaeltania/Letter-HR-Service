import * as mammoth from 'mammoth';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  const result = await mammoth.convertToHtml(
    { path: path.join(__dirname, 'templates/docx/kontrak-kerja-karyawan.docx') }
  );
  fs.writeFileSync('/tmp/kk.html', result.value);
}
run();
