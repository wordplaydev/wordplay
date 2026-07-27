import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';
import {
    chunkWrites,
    MAX_BATCH_WRITES,
    serializedByteSize,
} from '@db/projects/chunkWrites';

/**
 * These pin the batching rule that keeps a cloud save from stranding work.
 *
 * A Firestore batch commits atomically, so anything that makes one request
 * un-committable fails every project in it — and since persist() retries the
 * same set on every load, those projects stay "unsaved" forever while the
 * status still reports a successful round. Bounding a batch by payload size,
 * not just operation count, is what stops a pile of large projects from
 * becoming permanently unsavable.
 */

function entries(...sizes: number[]) {
    return sizes.map((bytes, index) => ({ id: index, bytes }));
}

describe('chunkWrites', () => {
    test('keeps everything in one chunk when both bounds allow it', () => {
        expect(chunkWrites(entries(1, 1, 1), 10, 100)).toEqual([
            entries(1, 1, 1),
        ]);
    });

    test('an empty set produces no chunks', () => {
        expect(chunkWrites([], 10, 100)).toEqual([]);
    });

    test('splits on operation count', () => {
        const chunks = chunkWrites(entries(1, 1, 1, 1, 1), 2, 1000);
        expect(chunks.map((c) => c.length)).toEqual([2, 2, 1]);
    });

    test('splits on accumulated bytes even when the count is fine', () => {
        // Three 40-byte docs under a 100-byte cap: 40+40 fits, the third
        // starts a new chunk. Counting operations alone would have sent one
        // 120-byte request that the backend rejects — taking all three down.
        const chunks = chunkWrites(entries(40, 40, 40), 100, 100);
        expect(chunks.map((c) => c.length)).toEqual([2, 1]);
    });

    test('no chunk exceeds the byte budget once it holds more than one entry', () => {
        const chunks = chunkWrites(entries(30, 30, 30, 30, 30, 30), 100, 100);
        for (const chunk of chunks)
            if (chunk.length > 1)
                expect(
                    chunk.reduce((sum, e) => sum + e.bytes, 0),
                ).toBeLessThanOrEqual(100);
    });

    test('an entry over the budget still gets carried, alone, rather than dropped', () => {
        // Callers screen individually-oversized docs before this; anything that
        // reaches here must still come out the other side, or a project would
        // vanish from the save set with no failure reported.
        const chunks = chunkWrites(entries(5, 500, 5), 10, 100);
        expect(chunks.flat().map((e) => e.bytes)).toEqual([5, 500, 5]);
        expect(chunks.find((c) => c[0]?.bytes === 500)).toHaveLength(1);
    });

    test('every entry survives chunking, in order', () => {
        const input = entries(10, 20, 30, 40, 50, 60, 70);
        expect(chunkWrites(input, 3, 90).flat()).toEqual(input);
    });

    test('defaults bound a batch below the Firestore operation cap', () => {
        const chunks = chunkWrites(
            Array.from({ length: MAX_BATCH_WRITES + 1 }, () => ({ bytes: 1 })),
        );
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toHaveLength(MAX_BATCH_WRITES);
    });
});

describe('serializedByteSize', () => {
    test('measures a real serialized project as non-trivial UTF-8 bytes', () => {
        const project = Project.make(
            'project-1',
            'sized',
            new Source('main', 'a'),
            [],
            DefaultLocale,
        );
        const serialized = project.serialize();
        expect(serializedByteSize(serialized)).toBe(
            new TextEncoder().encode(JSON.stringify(serialized)).length,
        );
        expect(serializedByteSize(serialized)).toBeGreaterThan(0);
    });

    test('counts bytes, not code units, so multi-byte source text is not undercounted', () => {
        // An emoji-heavy project measured by string length would look ~4x
        // smaller than what actually goes over the wire, which is exactly the
        // undercount that lets an oversized request through.
        const project = Project.make(
            'project-2',
            'emoji',
            new Source('main', '"😀😀😀😀😀😀😀😀"'),
            [],
            DefaultLocale,
        );
        const serialized = project.serialize();
        expect(serializedByteSize(serialized)).toBeGreaterThan(
            JSON.stringify(serialized).length,
        );
    });
});
