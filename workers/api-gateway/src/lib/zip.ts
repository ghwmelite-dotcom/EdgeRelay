// zip.ts
// ---------------------------------------------------------------------------
// Minimal, dependency-free ZIP writer for the Cloudflare Workers runtime.
//
// Uses the STORE method (no compression, method 0) — the files we bundle are
// small MQL5 text sources (tens of KB), so compression buys nothing and STORE
// keeps the implementation tiny and fully auditable. No `node:zlib` needed.
//
// Produces a spec-compliant ZIP: for each entry a local file header + data,
// followed by the central directory and end-of-central-directory record.
// ---------------------------------------------------------------------------

export interface ZipEntry {
  /** Path within the archive, e.g. "Experts/EdgeRelay_Master.mq5". Use forward slashes. */
  name: string;
  /** File contents. */
  data: string | Uint8Array;
}

// Precomputed CRC-32 lookup table (IEEE 802.3 polynomial).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date/time. We use a fixed timestamp so archives are deterministic. */
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1; // 2024-01-01

/**
 * Build a ZIP archive from the given entries.
 * @returns the raw archive bytes.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();

  interface Prepared {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }

  const prepared: Prepared[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;

  // ── Local file headers + file data ──
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    const crc = crc32(dataBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // local file header signature
    view.setUint16(4, 20, true); // version needed to extract (2.0)
    view.setUint16(6, 0, true); // general purpose flag
    view.setUint16(8, 0, true); // compression method: STORE
    view.setUint16(10, DOS_TIME, true);
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, dataBytes.length, true); // compressed size
    view.setUint32(22, dataBytes.length, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // extra field length
    header.set(nameBytes, 30);

    prepared.push({ nameBytes, dataBytes, crc, offset });
    localParts.push(header, dataBytes);
    offset += header.length + dataBytes.length;
  }

  // ── Central directory ──
  const centralParts: Uint8Array[] = [];
  const centralStart = offset;
  let centralSize = 0;

  for (const p of prepared) {
    const record = new Uint8Array(46 + p.nameBytes.length);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x02014b50, true); // central directory header signature
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed to extract
    view.setUint16(8, 0, true); // general purpose flag
    view.setUint16(10, 0, true); // compression method: STORE
    view.setUint16(12, DOS_TIME, true);
    view.setUint16(14, DOS_DATE, true);
    view.setUint32(16, p.crc, true);
    view.setUint32(20, p.dataBytes.length, true); // compressed size
    view.setUint32(24, p.dataBytes.length, true); // uncompressed size
    view.setUint16(28, p.nameBytes.length, true);
    view.setUint16(30, 0, true); // extra field length
    view.setUint16(32, 0, true); // file comment length
    view.setUint16(34, 0, true); // disk number start
    view.setUint16(36, 0, true); // internal file attributes
    view.setUint32(38, 0, true); // external file attributes
    view.setUint32(42, p.offset, true); // relative offset of local header
    record.set(p.nameBytes, 46);

    centralParts.push(record);
    centralSize += record.length;
  }

  // ── End of central directory record ──
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // number of this disk
  eocdView.setUint16(6, 0, true); // disk where central directory starts
  eocdView.setUint16(8, prepared.length, true); // central dir records on this disk
  eocdView.setUint16(10, prepared.length, true); // total central dir records
  eocdView.setUint32(12, centralSize, true); // size of central directory
  eocdView.setUint32(16, centralStart, true); // offset of central directory
  eocdView.setUint16(20, 0, true); // comment length

  // ── Concatenate everything ──
  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}
