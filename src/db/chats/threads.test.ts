import { describe, expect, test } from 'vitest';
import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';
import { groupThreads, replyCount } from '@db/chats/threads';

function msg(id: string, time: number, replyTo?: string): SerializedMessage {
    return {
        id,
        time,
        creator: 'u1',
        text: id,
        ...(replyTo === undefined ? {} : { replyTo }),
    };
}

describe('groupThreads', () => {
    test('a conversation with no replies is all roots', () => {
        const { roots, repliesByRoot } = groupThreads([
            msg('a', 1),
            msg('b', 2),
        ]);
        expect(roots.map((m) => m.id)).toEqual(['a', 'b']);
        expect(repliesByRoot.size).toBe(0);
    });

    test('replies are collected under their root and out of the room', () => {
        const { roots, repliesByRoot } = groupThreads([
            msg('a', 1),
            msg('b', 2, 'a'),
            msg('c', 3),
            msg('d', 4, 'a'),
        ]);
        expect(roots.map((m) => m.id)).toEqual(['a', 'c']);
        expect(repliesByRoot.get('a')?.map((m) => m.id)).toEqual(['b', 'd']);
    });

    test('replies are ordered oldest first regardless of stored order', () => {
        // arrayUnion appends, so a message can reach the array out of time
        // order; a thread should still read forwards.
        const { repliesByRoot } = groupThreads([
            msg('a', 1),
            msg('late', 9, 'a'),
            msg('early', 5, 'a'),
        ]);
        expect(repliesByRoot.get('a')?.map((m) => m.id)).toEqual([
            'early',
            'late',
        ]);
    });

    test('a reply to a reply joins the thread rather than starting one', () => {
        const { roots, repliesByRoot } = groupThreads([
            msg('a', 1),
            msg('b', 2, 'a'),
            msg('c', 3, 'b'),
        ]);
        expect(roots.map((m) => m.id)).toEqual(['a']);
        expect(repliesByRoot.get('a')?.map((m) => m.id)).toEqual(['b', 'c']);
        expect(repliesByRoot.has('b')).toBe(false);
    });

    test('a reply whose parent was trimmed away becomes a root', () => {
        // The chat drops its oldest messages when it outgrows its budget, so a
        // thread's beginning can genuinely be gone. The replies stay in the
        // room rather than vanishing with it.
        const { roots, repliesByRoot } = groupThreads([msg('b', 2, 'gone')]);
        expect(roots.map((m) => m.id)).toEqual(['b']);
        expect(repliesByRoot.size).toBe(0);
    });

    test('a cycle does not hang', () => {
        // Nothing writes this, and nothing checks it either.
        const { roots } = groupThreads([msg('a', 1, 'b'), msg('b', 2, 'a')]);
        expect(roots.map((m) => m.id).sort()).toEqual(['a', 'b']);
    });
});

describe('replyCount', () => {
    test('counts a thread, and says zero for a message with no thread', () => {
        const threads = groupThreads([msg('a', 1), msg('b', 2, 'a')]);
        expect(replyCount(threads, 'a')).toBe(1);
        expect(replyCount(threads, 'nobody')).toBe(0);
    });
});
