/**
 * A minimal ZIP writer, so an account export can hand a creator a folder of
 * readable files rather than one opaque blob (#152).
 *
 * Written rather than depended on: the whole format needed here is four
 * little-endian structures and a CRC, and the alternative was a dependency on
 * every page that can reach the profile. Nothing in here knows what Wordplay
 * is, which is also what lets `src/db/export`'s proxy convention test scope
 * itself to files that read Firestore.
 *
 * Deliberately not supported, because nothing here needs it: Zip64, directory
 * entries (every extractor creates folders from the paths), data descriptors,
 * encryption, and archive comments.
 */

/** One file in the archive. */
export type ZipEntry = {
    /** POSIX path inside the archive: '/' separated, never leading '/'. */
    path: string;
    bytes: Uint8Array;
    /** Floored to the DOS epoch (1980-01-01) when absent or earlier. */
    modified?: Date;
};

/** Compresses with raw DEFLATE, or answers undefined when it cannot. Injected
 *  so the store-only path is tested directly rather than by hoping a test
 *  runtime lacks the platform API. */
export type Deflate = (bytes: Uint8Array) => Promise<Uint8Array | undefined>;

/** Thrown rather than emitting an archive whose 32-bit fields have silently
 *  wrapped. Every ceiling below is one Zip64 exists to lift; a creator reaching
 *  one has hit a browser's memory ceiling long before (see #152's plan), so the
 *  honest answer is to say so rather than to grow the format. */
export class ZipTooLarge extends Error {}

/** ZIP's 16-bit entry count, and the three 32-bit size/offset fields. */
const MaxEntries = 0xffff;
const MaxBytes = 0xffffffff;

/**
 * Bit 11 of the general-purpose flags: the entry name is UTF-8. Without it a
 * Windows extractor reads the name in its legacy code page, so a project named
 * in Japanese arrives as mojibake — and Wordplay project names are very often
 * not Latin. Bit 3 (sizes follow the data) stays clear: every entry is
 * compressed into memory before its header is written, so the CRC and both
 * sizes are known in time.
 */
const UTF8NameFlag = 0x0800;

const StoreMethod = 0;
const DeflateMethod = 8;

const LocalHeaderSignature = 0x04034b50;
const CentralHeaderSignature = 0x02014b50;
const EndOfDirectorySignature = 0x06054b50;

/** MS-DOS 2.0, the floor for everything used here. */
const VersionNeeded = 20;

/** CRC-32 (IEEE 802.3), reflected. Built once on first use rather than at
 *  module load: a page that never exports an account never pays for it. */
let table: Uint32Array | undefined = undefined;
function crcTable(): Uint32Array {
    if (table !== undefined) return table;
    const built = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++)
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        built[n] = c >>> 0;
    }
    return (table = built);
}

/** The CRC-32 of the *uncompressed* bytes, which is what ZIP records whether
 *  or not the entry is compressed. */
export function crc32(bytes: Uint8Array): number {
    const lookup = crcTable();
    let c = 0xffffffff;
    for (const byte of bytes) c = (lookup[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/**
 * The platform's raw DEFLATE, or undefined where there isn't one.
 *
 * Detected by constructing rather than by testing for the global: Chrome 80-102
 * have `CompressionStream` but not the 'deflate-raw' format, and asking for it
 * there throws. Raw, not 'deflate': ZIP stores the deflate stream without zlib's
 * two-byte header and four-byte checksum around it.
 */
export function platformDeflate(): Deflate | undefined {
    if (typeof CompressionStream === 'undefined') return undefined;
    try {
        new CompressionStream('deflate-raw');
    } catch {
        return undefined;
    }
    return async (bytes) => {
        try {
            const stream = new Blob([copyOf(bytes)])
                .stream()
                .pipeThrough(new CompressionStream('deflate-raw'));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch {
            // A compression failure is never worth losing the archive over —
            // the caller stores the entry instead.
            return undefined;
        }
    };
}

/**
 * A standalone ArrayBuffer holding this view's bytes.
 *
 * A `Uint8Array` may be a window onto a larger buffer, and `Blob` wants the
 * whole thing. Built by allocating and copying rather than by slicing
 * `bytes.buffer`, whose type is `ArrayBufferLike` — a slice of it may be a
 * `SharedArrayBuffer`, which `Blob` will not take, and narrowing that with an
 * assertion is what this repo forbids.
 */
function copyOf(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

/** The DOS epoch, which is the earliest moment a ZIP timestamp can express. */
const DOSEpoch = new Date(1980, 0, 1);

/** MS-DOS packed time and date, in local time — which is what the format says,
 *  and why two extractors in two time zones disagree about a file's minute. */
function dosStamp(when: Date | undefined): { time: number; date: number } {
    const at =
        when === undefined || Number.isNaN(when.getTime()) || when < DOSEpoch
            ? DOSEpoch
            : when;
    return {
        time:
            (at.getHours() << 11) |
            (at.getMinutes() << 5) |
            (Math.floor(at.getSeconds() / 2) & 0x1f),
        date:
            ((at.getFullYear() - 1980) << 9) |
            ((at.getMonth() + 1) << 5) |
            at.getDate(),
    };
}

/** Accumulates the archive's bytes. A list of chunks joined once at the end,
 *  rather than a growing array: the archive is assembled whole in memory and
 *  copying it on every append is what makes that expensive. */
class Bytes {
    private readonly chunks: Uint8Array[] = [];
    private written = 0;

    get length(): number {
        return this.written;
    }

    push(chunk: Uint8Array) {
        this.chunks.push(chunk);
        this.written += chunk.length;
    }

    join(): Uint8Array {
        const all = new Uint8Array(this.written);
        let at = 0;
        for (const chunk of this.chunks) {
            all.set(chunk, at);
            at += chunk.length;
        }
        return all;
    }
}

/** A fixed-size little-endian record, written field by field in format order. */
class Record {
    private readonly bytes: Uint8Array;
    private readonly view: DataView;
    private at = 0;

    constructor(size: number) {
        this.bytes = new Uint8Array(size);
        this.view = new DataView(this.bytes.buffer);
    }

    u16(value: number): Record {
        this.view.setUint16(this.at, value, true);
        this.at += 2;
        return this;
    }

    u32(value: number): Record {
        this.view.setUint32(this.at, value >>> 0, true);
        this.at += 4;
        return this;
    }

    done(): Uint8Array {
        return this.bytes;
    }
}

/** What each entry contributed, kept for the central directory. */
type Written = {
    name: Uint8Array;
    method: number;
    time: number;
    date: number;
    crc: number;
    compressed: number;
    uncompressed: number;
    offset: number;
};

const encoder = new TextEncoder();

/**
 * The archive's bytes.
 *
 * Entries are written in the order given; the caller sorts them, which is what
 * makes two exports of unchanged state byte-identical.
 *
 * Compression is per entry, so a runtime without raw DEFLATE simply stores
 * everything, and an entry that deflates no smaller than it already is gets
 * stored too — otherwise a forty-byte file grows.
 */
export async function writeZip(
    entries: readonly ZipEntry[],
    deflate: Deflate | undefined = platformDeflate(),
): Promise<Uint8Array> {
    if (entries.length > MaxEntries)
        throw new ZipTooLarge(
            `${entries.length} files is more than a ZIP's ${MaxEntries}.`,
        );

    const archive = new Bytes();
    const written: Written[] = [];

    for (const entry of entries) {
        const offset = archive.length;
        if (offset > MaxBytes)
            throw new ZipTooLarge('The archive is larger than 4GB.');
        if (entry.bytes.length > MaxBytes)
            throw new ZipTooLarge(`${entry.path} is larger than 4GB.`);

        const name = encoder.encode(entry.path);
        const { time, date } = dosStamp(entry.modified);
        const crc = crc32(entry.bytes);

        const compressed =
            deflate === undefined ? undefined : await deflate(entry.bytes);
        // Never let compression enlarge: an incompressible payload (the base64
        // CRDT snapshots are close to it) and a tiny one both come back bigger.
        const smaller =
            compressed !== undefined && compressed.length < entry.bytes.length
                ? compressed
                : undefined;
        const data = smaller ?? entry.bytes;
        const method = smaller === undefined ? StoreMethod : DeflateMethod;

        archive.push(
            new Record(30)
                .u32(LocalHeaderSignature)
                .u16(VersionNeeded)
                .u16(UTF8NameFlag)
                .u16(method)
                .u16(time)
                .u16(date)
                .u32(crc)
                .u32(data.length)
                .u32(entry.bytes.length)
                .u16(name.length)
                .u16(0)
                .done(),
        );
        archive.push(name);
        archive.push(data);

        written.push({
            name,
            method,
            time,
            date,
            crc,
            compressed: data.length,
            uncompressed: entry.bytes.length,
            offset,
        });
    }

    const directoryOffset = archive.length;
    for (const entry of written) {
        archive.push(
            new Record(46)
                .u32(CentralHeaderSignature)
                // Made by MS-DOS, version 2.0.
                .u16(0x0014)
                .u16(VersionNeeded)
                .u16(UTF8NameFlag)
                .u16(entry.method)
                .u16(entry.time)
                .u16(entry.date)
                .u32(entry.crc)
                .u32(entry.compressed)
                .u32(entry.uncompressed)
                .u16(entry.name.length)
                // Extra field, file comment, disk number, internal attributes,
                // external attributes: none, and none meaningful for a file
                // written by a browser.
                .u16(0)
                .u16(0)
                .u16(0)
                .u16(0)
                .u32(0)
                .u32(entry.offset)
                .done(),
        );
        archive.push(entry.name);
    }

    const directorySize = archive.length - directoryOffset;
    if (directoryOffset > MaxBytes || archive.length > MaxBytes)
        throw new ZipTooLarge('The archive is larger than 4GB.');

    archive.push(
        new Record(22)
            .u32(EndOfDirectorySignature)
            .u16(0)
            .u16(0)
            .u16(written.length)
            .u16(written.length)
            .u32(directorySize)
            .u32(directoryOffset)
            .u16(0)
            .done(),
    );

    return archive.join();
}
