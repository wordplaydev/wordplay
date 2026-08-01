/**
 * Getting the source recordings, and proving they are what we think.
 *
 * Two deliberate differences from `scripts/fonts/download.ts`, which fetches
 * over HTTP with no integrity check at all (its own comment calls the path
 * unproven):
 *
 * - Every fetched file is **hashed**, and the hash is recorded in the
 *   lockfile. A rebuild that pulls different bytes than the one that produced
 *   the committed mp3s fails loudly instead of silently reshipping.
 * - The VSCO archive is read with **HTTP range requests**, so regenerating
 *   three orchestral instruments costs ~60 MB rather than the 776 MB of the
 *   whole zip. That matters because a contributor should be able to rerun
 *   this without a fileserver's worth of bandwidth.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

/** Downloaded sources live outside the repo; they are never committed. */
export const CacheDir = path.join('node_modules', '.cache', 'instruments');

export function hashOf(bytes: Buffer | Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex');
}

/** Fetch a URL, optionally a byte range, with retries. */
async function get(url: string, range?: [number, number]): Promise<Buffer> {
    let lastError: unknown = undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(url, {
                headers:
                    range === undefined
                        ? {}
                        : { Range: `bytes=${range[0]}-${range[1]}` },
            });
            if (!response.ok && response.status !== 206)
                throw new Error(`${response.status} ${response.statusText}`);
            return Buffer.from(await response.arrayBuffer());
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
    }
    throw new Error(`failed to fetch ${url}: ${String(lastError)}`);
}

/** Fetch a file, caching it on disk so repeated builds don't re-download. */
export async function fetchCached(
    url: string,
    key: string,
): Promise<Buffer> {
    const file = path.join(CacheDir, key);
    if (existsSync(file)) return readFile(file);
    const bytes = await get(url);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return bytes;
}

/* -------------------------------------------------------------------------
 * Reading one entry out of a remote ZIP
 * ---------------------------------------------------------------------- */

export type ZipEntry = {
    name: string;
    compressedSize: number;
    size: number;
    offset: number;
    method: number;
};

/** Read a remote ZIP's central directory without downloading the archive. */
export async function readRemoteZipIndex(
    url: string,
): Promise<Map<string, ZipEntry>> {
    const head = await fetch(url, { method: 'HEAD' });
    const total = Number(head.headers.get('content-length'));
    if (!Number.isFinite(total) || total <= 0)
        throw new Error(`no content-length for ${url}`);

    // The end-of-central-directory record is within the last 64KB unless the
    // archive has a giant comment.
    const tailSize = Math.min(70_000, total);
    const tail = await get(url, [total - tailSize, total - 1]);
    const marker = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (marker < 0) throw new Error('no end-of-central-directory record');

    const directorySize = tail.readUInt32LE(marker + 12);
    const directoryOffset = tail.readUInt32LE(marker + 16);
    if (directoryOffset === 0xffffffff)
        throw new Error('ZIP64 archives are not supported');

    const directory = await get(url, [
        directoryOffset,
        directoryOffset + directorySize - 1,
    ]);

    const entries = new Map<string, ZipEntry>();
    let position = 0;
    while (
        position + 46 <= directory.length &&
        directory.readUInt32LE(position) === 0x02014b50
    ) {
        const method = directory.readUInt16LE(position + 10);
        const compressedSize = directory.readUInt32LE(position + 20);
        const size = directory.readUInt32LE(position + 24);
        const nameLength = directory.readUInt16LE(position + 28);
        const extraLength = directory.readUInt16LE(position + 30);
        const commentLength = directory.readUInt16LE(position + 32);
        const offset = directory.readUInt32LE(position + 42);
        const name = directory.toString(
            'utf8',
            position + 46,
            position + 46 + nameLength,
        );
        entries.set(name, { name, compressedSize, size, offset, method });
        position += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

/** Pull one entry out of a remote ZIP and inflate it. */
export async function readRemoteZipEntry(
    url: string,
    entry: ZipEntry,
): Promise<Buffer> {
    // The local header repeats the name/extra lengths, which may differ from
    // the central directory's, so the data offset has to be read from it.
    const header = await get(url, [entry.offset, entry.offset + 29]);
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const start = entry.offset + 30 + nameLength + extraLength;
    const raw = await get(url, [start, start + entry.compressedSize - 1]);
    if (entry.method === 0) return raw;
    if (entry.method === 8) return inflateRawSync(raw);
    throw new Error(`unsupported ZIP compression method ${entry.method}`);
}

/** Read a local (in-memory) ZIP's entries, for the nested XRNI archives. */
export function readZipEntries(buffer: Buffer): Map<string, Buffer> {
    const entries = new Map<string, Buffer>();
    const marker = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (marker < 0) throw new Error('no end-of-central-directory record');
    const directorySize = buffer.readUInt32LE(marker + 12);
    const directoryOffset = buffer.readUInt32LE(marker + 16);

    let position = directoryOffset;
    const end = directoryOffset + directorySize;
    while (
        position + 46 <= end &&
        buffer.readUInt32LE(position) === 0x02014b50
    ) {
        const method = buffer.readUInt16LE(position + 10);
        const compressedSize = buffer.readUInt32LE(position + 20);
        const nameLength = buffer.readUInt16LE(position + 28);
        const extraLength = buffer.readUInt16LE(position + 30);
        const commentLength = buffer.readUInt16LE(position + 32);
        const offset = buffer.readUInt32LE(position + 42);
        const name = buffer.toString(
            'utf8',
            position + 46,
            position + 46 + nameLength,
        );

        const localNameLength = buffer.readUInt16LE(offset + 26);
        const localExtraLength = buffer.readUInt16LE(offset + 28);
        const start = offset + 30 + localNameLength + localExtraLength;
        const raw = buffer.subarray(start, start + compressedSize);
        entries.set(name, method === 0 ? raw : inflateRawSync(raw));

        position += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}
