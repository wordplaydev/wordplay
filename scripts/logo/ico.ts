/**
 * Minimal ICO container writer: wraps pre-rendered PNGs in the ICONDIR /
 * ICONDIRENTRY structure. PNG-embedded ICO has been universally supported
 * since Windows Vista-era browsers, and the SVG icon link shields anything
 * modern anyway.
 */
export function encodeIco(pngs: { size: number; data: Buffer }[]): Buffer {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(pngs.length, 4);

    const entries: Buffer[] = [];
    let offset = 6 + 16 * pngs.length;
    for (const { size, data } of pngs) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
        entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
        entry.writeUInt8(0, 2); // palette colors
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // color planes
        entry.writeUInt16LE(32, 6); // bits per pixel
        entry.writeUInt32LE(data.length, 8);
        entry.writeUInt32LE(offset, 12);
        entries.push(entry);
        offset += data.length;
    }

    return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}
