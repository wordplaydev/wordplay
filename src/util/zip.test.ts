import { inflateRawSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import {
    crc32,
    platformDeflate,
    writeZip,
    ZipTooLarge,
    type Deflate,
    type ZipEntry,
} from './zip';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytes(text: string): Uint8Array {
    return encoder.encode(text);
}

/** Never compresses, so the store path is exercised directly rather than by
 *  hoping the test runtime lacks `CompressionStream`. */
const storeOnly: Deflate = async () => undefined;

type Parsed = {
    path: string;
    method: number;
    crc: number;
    compressed: number;
    uncompressed: number;
    offset: number;
    flags: number;
    data: Uint8Array;
};

/**
 * Reads an archive the way an extractor does: find the end-of-directory record,
 * walk the central directory, then check each entry against its own local
 * header. Hand-written rather than mocked — the whole point is to read the
 * bytes back with something that shares no code with the writer.
 */
function parseZip(archive: Uint8Array): Parsed[] {
    const view = new DataView(
        archive.buffer,
        archive.byteOffset,
        archive.byteLength,
    );

    // The EOCD has no comment here, so it is the last 22 bytes.
    const end = archive.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    const count = view.getUint16(end + 10, true);
    expect(view.getUint16(end + 8, true)).toBe(count);
    const size = view.getUint32(end + 12, true);
    const start = view.getUint32(end + 16, true);
    expect(start + size).toBe(end);

    const entries: Parsed[] = [];
    let at = start;
    for (let n = 0; n < count; n++) {
        expect(view.getUint32(at, true)).toBe(0x02014b50);
        const flags = view.getUint16(at + 8, true);
        const method = view.getUint16(at + 10, true);
        const crc = view.getUint32(at + 16, true);
        const compressed = view.getUint32(at + 20, true);
        const uncompressed = view.getUint32(at + 24, true);
        const nameLength = view.getUint16(at + 28, true);
        const offset = view.getUint32(at + 42, true);
        const path = decoder.decode(
            archive.subarray(at + 46, at + 46 + nameLength),
        );

        // Every field the central directory states must match the local header,
        // or an extractor reading either one gets a different answer.
        expect(view.getUint32(offset, true)).toBe(0x04034b50);
        expect(view.getUint16(offset + 6, true)).toBe(flags);
        expect(view.getUint16(offset + 8, true)).toBe(method);
        expect(view.getUint32(offset + 14, true)).toBe(crc);
        expect(view.getUint32(offset + 18, true)).toBe(compressed);
        expect(view.getUint32(offset + 22, true)).toBe(uncompressed);
        const localNameLength = view.getUint16(offset + 26, true);
        const extraLength = view.getUint16(offset + 28, true);
        expect(
            decoder.decode(
                archive.subarray(offset + 30, offset + 30 + localNameLength),
            ),
        ).toBe(path);

        const dataAt = offset + 30 + localNameLength + extraLength;
        entries.push({
            path,
            method,
            crc,
            compressed,
            uncompressed,
            offset,
            flags,
            data: archive.subarray(dataAt, dataAt + compressed),
        });
        at +=
            46 +
            nameLength +
            view.getUint16(at + 30, true) +
            view.getUint16(at + 32, true);
    }
    expect(at).toBe(end);
    return entries;
}

/** What an extractor would write to disk for this entry. */
function contentOf(entry: Parsed): Uint8Array {
    const raw =
        entry.method === 0
            ? entry.data
            : new Uint8Array(inflateRawSync(entry.data));
    expect(raw.length).toBe(entry.uncompressed);
    expect(crc32(raw)).toBe(entry.crc);
    return raw;
}

describe('crc32', () => {
    // The standard IEEE 802.3 check values, which is what makes this a test of
    // the polynomial rather than of itself.
    test('matches the standard check values', () => {
        expect(crc32(bytes(''))).toBe(0);
        expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
        expect(crc32(bytes('a'))).toBe(0xe8b7be43);
    });

    test('is unsigned', () => {
        // A signed right shift here returns a negative number, which a u32
        // field would then write as something else entirely.
        expect(crc32(bytes('The quick brown fox'))).toBeGreaterThanOrEqual(0);
    });
});

describe('writeZip', () => {
    test('round-trips stored entries', async () => {
        const entries: ZipEntry[] = [
            { path: 'README.txt', bytes: bytes('hello') },
            {
                path: 'projects/owner/cat-a1b2c3d4.wp',
                bytes: bytes('🐈\ncat\n=== \n1 + 1\n'),
            },
        ];
        const parsed = parseZip(await writeZip(entries, storeOnly));
        expect(parsed.map((e) => e.path)).toEqual([
            'README.txt',
            'projects/owner/cat-a1b2c3d4.wp',
        ]);
        expect(parsed.every((e) => e.method === 0)).toBe(true);
        expect(decoder.decode(contentOf(parsed[0]!))).toBe('hello');
        expect(decoder.decode(contentOf(parsed[1]!))).toBe(
            '🐈\ncat\n=== \n1 + 1\n',
        );
    });

    test('round-trips deflated entries through zlib', async () => {
        const deflate = platformDeflate();
        expect(deflate).toBeDefined();
        // Long and repetitive, so deflate is certain to be smaller.
        const text = 'the same sentence over and over. '.repeat(200);
        const parsed = parseZip(
            await writeZip([{ path: 'big.json', bytes: bytes(text) }], deflate),
        );
        expect(parsed[0]!.method).toBe(8);
        expect(parsed[0]!.compressed).toBeLessThan(parsed[0]!.uncompressed);
        expect(decoder.decode(contentOf(parsed[0]!))).toBe(text);
    });

    test('stores rather than enlarges an entry deflate cannot shrink', async () => {
        // A short string's deflate stream is longer than the string.
        const parsed = parseZip(
            await writeZip(
                [{ path: 'tiny', bytes: bytes('x') }],
                platformDeflate(),
            ),
        );
        expect(parsed[0]!.method).toBe(0);
        expect(parsed[0]!.compressed).toBe(1);
    });

    test('stores everything when the platform has no deflate', async () => {
        const text = 'the same sentence over and over. '.repeat(200);
        const parsed = parseZip(
            await writeZip(
                [{ path: 'big.json', bytes: bytes(text) }],
                undefined,
            ),
        );
        // Passing undefined means "detect the platform", so assert the injected
        // refusal instead — that is the branch a browser without deflate takes.
        const stored = parseZip(
            await writeZip(
                [{ path: 'big.json', bytes: bytes(text) }],
                storeOnly,
            ),
        );
        expect(stored[0]!.method).toBe(0);
        expect(decoder.decode(contentOf(stored[0]!))).toBe(text);
        expect(decoder.decode(contentOf(parsed[0]!))).toBe(text);
    });

    test('marks every name as UTF-8', async () => {
        // Without flag bit 11 a Windows extractor reads these in its legacy
        // code page, and a project named in Japanese arrives as mojibake.
        const names = ['日本語のプロジェクト.wp', '👨‍👩‍👧‍👦.wp', 'Ñandú café.json'];
        const parsed = parseZip(
            await writeZip(
                names.map((path) => ({ path, bytes: bytes('x') })),
                storeOnly,
            ),
        );
        expect(parsed.map((e) => e.path)).toEqual(names);
        expect(parsed.every((e) => (e.flags & 0x0800) !== 0)).toBe(true);
    });

    test('writes an empty archive', async () => {
        const archive = await writeZip([], storeOnly);
        expect(archive.length).toBe(22);
        expect(parseZip(archive)).toEqual([]);
    });

    test('writes an empty file', async () => {
        const parsed = parseZip(
            await writeZip(
                [{ path: 'empty.json', bytes: new Uint8Array(0) }],
                storeOnly,
            ),
        );
        expect(parsed[0]!.uncompressed).toBe(0);
        expect(parsed[0]!.crc).toBe(0);
    });

    test('refuses more entries than a ZIP can count', async () => {
        const many = Array.from({ length: 65536 }, (_, n) => ({
            path: `f${n}`,
            bytes: new Uint8Array(0),
        }));
        await expect(writeZip(many, storeOnly)).rejects.toThrow(ZipTooLarge);
    });

    test('is byte-identical for identical input', async () => {
        const entries: ZipEntry[] = [
            {
                path: 'a.json',
                bytes: bytes('{"a":1}'),
                modified: new Date(2026, 0, 2, 3, 4, 5),
            },
            {
                path: 'b.json',
                bytes: bytes('{"b":2}'),
                modified: new Date(2026, 0, 2, 3, 4, 5),
            },
        ];
        expect(await writeZip(entries, storeOnly)).toEqual(
            await writeZip(entries, storeOnly),
        );
    });

    test('floors a timestamp below the DOS epoch rather than wrapping it', async () => {
        // 1970 is before ZIP can express, and the year field is only 7 bits —
        // an unfloored value writes some other year entirely.
        const archive = await writeZip(
            [
                {
                    path: 'old',
                    bytes: bytes('x'),
                    modified: new Date(1970, 0, 1),
                },
            ],
            storeOnly,
        );
        const view = new DataView(
            archive.buffer,
            archive.byteOffset,
            archive.byteLength,
        );
        const date = view.getUint16(12, true);
        expect(date >>> 9).toBe(0);
        expect((date >>> 5) & 0xf).toBe(1);
        expect(date & 0x1f).toBe(1);
    });
});
