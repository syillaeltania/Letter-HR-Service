declare module 'pizzip' {
  class PizZip {
    constructor(data?: string | ArrayBuffer | Uint8Array | Buffer);
    file(path: string): { asUint8Array(): Uint8Array } | null;
  }

  export = PizZip;
}
