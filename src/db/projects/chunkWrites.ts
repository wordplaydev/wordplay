import type { SerializedProject } from '@db/projects/ProjectSchemas';

/**
 * Firestore caps a batched write at 500 operations. Stay below that so large
 * batches (e.g. a power user's first cloud sync of many local projects) commit
 * in chunks rather than being rejected.
 */
export const MAX_BATCH_WRITES = 450;

/**
 * Firestore also caps the whole commit *request* at about 10 MiB, independent
 * of the operation count. Stay under it so a batch of large projects is split
 * by size too — an oversized request is rejected atomically, so without this a
 * pile of big projects can never save, and every project batched alongside them
 * stays unsaved with it.
 */
export const MAX_BATCH_BYTES = 8 * 1024 * 1024;

/** Approximate encoded size of a serialized project, used to bound batches and
 *  to catch documents Firestore would reject outright. JSON length is a close
 *  enough proxy for Firestore's own accounting at the margins we care about. */
export function serializedByteSize(serialized: SerializedProject): number {
    return new TextEncoder().encode(JSON.stringify(serialized)).length;
}

/**
 * Split writes into batches bounded by BOTH operation count and payload size.
 *
 * Counting operations alone was not enough: many large projects could
 * accumulate into a single request over Firestore's size cap, and because a
 * batch commits atomically, that one oversized request failed every project in
 * it — on every retry, forever. That is how a backlog of permanently "unsaved"
 * projects builds up.
 *
 * An entry larger than `maxBytes` still gets its own chunk rather than being
 * dropped; callers screen individually-oversized documents before this.
 */
export function chunkWrites<T extends { bytes: number }>(
    entries: T[],
    maxCount: number = MAX_BATCH_WRITES,
    maxBytes: number = MAX_BATCH_BYTES,
): T[][] {
    const chunks: T[][] = [];
    let pending: T[] = [];
    let pendingBytes = 0;
    for (const entry of entries) {
        if (
            pending.length >= maxCount ||
            (pending.length > 0 && pendingBytes + entry.bytes > maxBytes)
        ) {
            chunks.push(pending);
            pending = [];
            pendingBytes = 0;
        }
        pending.push(entry);
        pendingBytes += entry.bytes;
    }
    if (pending.length > 0) chunks.push(pending);
    return chunks;
}
