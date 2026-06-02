export function encodeIco(pngBuffers: Buffer[]): Buffer {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDataSize = pngBuffers.reduce((a, b) => a + b.length, 0);
  const buf = Buffer.alloc(headerSize + count * dirEntrySize + totalDataSize);

  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);

  let offset = headerSize + count * dirEntrySize;
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const pos = headerSize + i * dirEntrySize;
    buf.writeUInt8(w === 256 ? 0 : w, pos);
    buf.writeUInt8(h === 256 ? 0 : h, pos + 1);
    buf.writeUInt8(0, pos + 2);
    buf.writeUInt8(0, pos + 3);
    buf.writeUInt16LE(1, pos + 4);
    buf.writeUInt16LE(32, pos + 6);
    buf.writeUInt32LE(png.length, pos + 8);
    buf.writeUInt32LE(offset, pos + 12);
    png.copy(buf, offset);
    offset += png.length;
  }
  return buf;
}
