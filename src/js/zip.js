// Minimal zip reader/writer (stored on write; stored + deflate on read). No dependencies.
const T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = u => { let c = ~0; for (const b of u) c = T[(c ^ b) & 255] ^ (c >>> 8); return ~c >>> 0; };
const enc = new TextEncoder(), dec = new TextDecoder();
export function writeZip(files) {
  const parts = [], cd = []; let off = 0, n = 0, cdSize = 0;
  for (const [name, data] of Object.entries(files)) {
    const nb = enc.encode(name), d = typeof data === 'string' ? enc.encode(data) : data, crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nb.length, true);
    parts.push(h.buffer, nb, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    cd.push(c.buffer, nb); cdSize += 46 + nb.length; off += 30 + nb.length + d.length; n++;
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cd, e.buffer], { type: 'application/zip' });
}
export async function readZip(buf) {
  const v = new DataView(buf), u = new Uint8Array(buf); let e = u.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Not a zip file');
  let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true), out = {};
  for (let i = 0; i < n; i++) {
    const m = v.getUint16(p + 10, true), cs = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true),
      xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
    const name = dec.decode(u.subarray(p + 46, p + 46 + nl));
    const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true);
    let d = u.slice(ds, ds + cs);
    if (m === 8) d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if (m !== 0) throw new Error('Unsupported zip compression');
    if (!name.endsWith('/')) out[name] = d;
    p += 46 + nl + xl + cl;
  }
  return out;
}
