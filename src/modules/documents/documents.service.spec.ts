import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';

describe('DocumentsService PDF HTML preparation', () => {
  it('embeds DOCX header/footer assets and print margins for the contract template', () => {
    const service = new DocumentsService({ get: jest.fn() } as unknown as ConfigService);
    const html = `
      <table>
        <thead><tr><td><img src="https://neuronworks.co.id/assets/images/logo/logo-nw.png" alt="Neuronworks"></td></tr></thead>
        <tbody><tr><td><span style="font-size: 16pt;">{{letter_number}}</span></td></tr></tbody>
        <tfoot><tr><td style="border-top: 2px solid #2d7d32;">Certified By:<img src="/missing-iso.png"><img src="/missing-iso-2.png"></td></tr></tfoot>
      </table>
    `;

    const prepared = (service as any).prepareHtmlForPdf(html);

    expect(prepared).toContain('@page');
    expect(prepared).toContain('margin: 36.8mm 16.5mm 35mm 23.9mm');
    expect(prepared).toContain('position: fixed');
    expect(prepared).toContain('top: -32.8mm');
    expect(prepared).toContain('line-height: 1.15');
    expect(prepared).toContain('padding-top: 0 !important');
    expect(prepared).toContain('nw-print-header');
    expect(prepared).not.toContain('<thead');
    expect(prepared).not.toContain('<tfoot');
    expect(prepared).toContain('line-height: 1.15');
    expect(prepared).toContain('break-after: avoid');
    expect(prepared).toContain('break-before: avoid');
    expect(prepared).toContain('break-inside: avoid');
    expect(prepared).toContain('page-break-after: avoid');
    expect(prepared).toContain('font-size: 6pt;">{{letter_number}}</span>');
    expect(prepared.match(/alt="ISO certification"/g)).toBeNull();
    expect(prepared).not.toContain('https://neuronworks.co.id/assets/images/logo/logo-nw.png');
    expect(prepared).not.toContain('/missing-iso.png');
    expect(prepared).not.toContain('/missing-iso-2.png');
  });

  it('marks Pasal headings so their description stays with the heading across page breaks', () => {
    const service = new DocumentsService({ get: jest.fn() } as unknown as ConfigService);
    const html = `
      <table>
        <tbody><tr><td>
          <p style="text-align:center"><strong>Pasal 1</strong></p>
          <p>Bahwa deskripsi pasal tidak boleh terpisah dari judulnya.</p>
        </td></tr></tbody>
      </table>
    `;

    const prepared = (service as any).prepareHtmlForPdf(html);

    expect(prepared).toContain('class="nw-pasal-heading"');
    expect(prepared).toContain('class="nw-after-pasal-heading"');
  });

  it('standardizes document title, subtitle letter number, and Pasal alignment', () => {
    const service = new DocumentsService({ get: jest.fn() } as unknown as ConfigService);
    const html = `
      <p><strong>SURAT EDARAN</strong></p>
      <p>Nomor : {{letter_number}}</p>
      <p><strong>Pasal 1</strong></p>
      <p>Deskripsi pasal.</p>
    `;

    const prepared = (service as any).prepareHtmlForPdf(html);

    expect(prepared).toContain('S U R A T&nbsp;&nbsp;E D A R A N');
    expect(prepared).toContain('class="nw-document-title"');
    expect(prepared).toContain('class="nw-letter-number-subtitle"');
    expect(prepared).toContain('class="nw-pasal-heading"');
  });

  it('renders the PDF header letter number as regular Verdana 6pt text', () => {
    const service = new DocumentsService({ get: jest.fn() } as unknown as ConfigService);

    const header = (service as any).buildPdfHeaderTemplate('NW-012/KK.01-OL/HCM/VI/2026', '');

    expect(header).toContain('font-family:Verdana,Arial,Helvetica,sans-serif');
    expect(header).toContain('font-size:6pt');
    expect(header).toContain('NW-012/KK.01-OL/HCM/VI/2026');
    expect(header).not.toContain('font-weight');
  });

  it('renders the PDF footer through Puppeteer footerTemplate so it stays at the page bottom', () => {
    const service = new DocumentsService({ get: jest.fn() } as unknown as ConfigService);
    const assets = (service as any).loadContractDocxAssets();

    const footer = (service as any).buildPdfFooterTemplate(assets);

    expect(footer).toContain('Certified By:');
    expect(footer.indexOf('Certified By:')).toBeLessThan(footer.indexOf('alt="ISO certification"'));
    expect(footer.indexOf('alt="ISO certification"')).toBeLessThan(footer.indexOf('PT. Neuronworks Indonesia'));
    expect(footer).toContain('padding:0 16.5mm 4mm 23.9mm');
    expect(footer).toContain('Kota Bandung Jawa Barat');
    expect(footer.match(/alt="ISO certification"/g)).toHaveLength(2);
  });
});
