import { readFileSync } from 'fs';
import { describe, expect, test } from 'vitest';
import {
    ChatWritableFields,
    GalleryServerOwnedFields,
    HowToFields,
} from './rulesFields';

/**
 * The client's field lists and `firestore.rules` are two statements of one fact,
 * and nothing but this test holds them together. When they drift, a client sends
 * a field the rule refuses, and the refusal is silent — the write is dropped, the
 * document is left permanently unsaved on that device, and the listener stops
 * applying server snapshots to it. That is #1348, #1349 and #1350, three times
 * over, so fail here instead.
 */
const Rules = readFileSync('firestore.rules', 'utf8');

/** The `match /<collection>/{…}` block, up to the next same-depth match. */
function block(collection: string): string {
    const start = Rules.indexOf(`match /${collection}/{`);
    expect(start, `no rule block for ${collection}`).toBeGreaterThan(-1);
    const rest = Rules.slice(start + 1);
    const next = rest.search(/\n {4}match \//);
    return next === -1 ? rest : rest.slice(0, next);
}

/** Every `hasOnly([...])` list in a chunk of rules, in source order. */
function hasOnlyLists(rules: string): string[][] {
    return Array.from(rules.matchAll(/hasOnly\(\[([^\]]*)\]\)/g)).map((match) =>
        Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g)).map((f) => f[1]),
    );
}

describe('the client writes exactly what firestore.rules admits', () => {
    test('a chat update carries only the keys the rule allows', () => {
        const lists = hasOnlyLists(block('chats'));
        expect(lists).toHaveLength(1);
        expect(lists[0].toSorted()).toEqual([...ChatWritableFields].toSorted());
    });

    test("a how-to's narrow openings are the ones the client sends", () => {
        // Order-independent: the rule states placement first, but which branch
        // comes first is not a fact worth pinning.
        const lists = hasOnlyLists(block('howtos')).map((list) =>
            list.toSorted().join(','),
        );
        for (const [name, fields] of Object.entries(HowToFields))
            expect(
                lists,
                `no rule branch matches HowToFields.${name}`,
            ).toContain([...fields].toSorted().join(','));
        expect(lists).toHaveLength(Object.keys(HowToFields).length);
    });

    test('a gallery update omits every field the rule requires unchanged', () => {
        // A denylist rather than an allowlist, so it is read from the
        // `galleryServerFieldsUnchanged()` guard rather than from `hasOnly`.
        const guard = block('galleries').slice(
            block('galleries').indexOf('function galleryServerFieldsUnchanged'),
        );
        const fields = new Set(
            Array.from(
                guard
                    .slice(0, guard.indexOf('}'))
                    .matchAll(/["']([^"']+)["'] in request\.resource\.data/g),
            ).map((match) => match[1]),
        );
        expect(Array.from(fields).toSorted()).toEqual(
            [...GalleryServerOwnedFields].toSorted(),
        );
    });
});
