import { describe, expect, test } from 'vitest';
import {
    BatchLimit,
    MaxFixedWrites,
    MaxOwned,
    RenamedCollections,
    renameOwned,
    tooManyOwned,
} from './changeUsername.js';

describe('the batch budget', () => {
    test('the worst case a rename can write fits in one batch', () => {
        expect(MaxFixedWrites + MaxOwned).toBeLessThanOrEqual(BatchLimit);
    });

    test('the cap is across collections, not per collection', () => {
        // A per-collection cap is the bug: every collection is within it on its own, and
        // the batch they share is over it. A refused write is silent, so that ships as a
        // rename that simply stops working for anyone with a lot of characters and kits.
        expect(RenamedCollections.length).toBeGreaterThan(1);
        expect(tooManyOwned(RenamedCollections.map(() => MaxOwned))).toBe(true);
        expect(tooManyOwned(RenamedCollections.map(() => 1))).toBe(false);
    });
});

describe('what a rename carries', () => {
    test('kits move with their owner, exactly as characters do', () => {
        // The failure this guards is silent and one-sided: a collection left out of the
        // rename keeps the old username in its `name` forever, every `↓ @old/kit` goes on
        // resolving to a document claiming to belong to a creator who no longer exists,
        // and nothing anywhere reports it (#8).
        expect([...RenamedCollections]).toEqual(['characters', 'kits']);
    });
});

describe('renameOwned', () => {
    test('takes the new username and keeps the old full name', () => {
        expect(renameOwned('old/colors', 'new', [])).toEqual({
            name: 'new/colors',
            aliases: ['old/colors'],
        });
    });

    test('accumulates aliases across renames', () => {
        // Someone who renames twice is still reachable at both earlier names.
        expect(renameOwned('second/colors', 'third', ['first/colors'])).toEqual(
            {
                name: 'third/colors',
                aliases: ['first/colors', 'second/colors'],
            },
        );
    });

    test('never duplicates an alias', () => {
        expect(
            renameOwned('old/colors', 'new', ['old/colors'])?.aliases,
        ).toEqual(['old/colors']);
    });

    test('leaves a nameless draft alone', () => {
        // Nothing after the slash is a draft nobody can reference.
        expect(renameOwned('old/', 'new', [])).toBeUndefined();
        expect(renameOwned('', 'new', [])).toBeUndefined();
        expect(renameOwned(undefined, 'new', [])).toBeUndefined();
    });

    test('a name with no slash is still carried', () => {
        expect(renameOwned('colors', 'new', [])).toEqual({
            name: 'new/colors',
            aliases: ['colors'],
        });
    });

    test('ignores a malformed aliases field rather than throwing', () => {
        expect(renameOwned('old/colors', 'new', 'nonsense')?.aliases).toEqual([
            'old/colors',
        ]);
    });
});
