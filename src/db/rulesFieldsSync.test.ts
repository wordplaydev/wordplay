import { readFileSync } from 'fs';
import { describe, expect, test } from 'vitest';
import {
    ChatWritableFields,
    GalleryServerOwnedFields,
    HowToFields,
    HowToServerOwnedFields,
    KitServerOwnedFields,
} from './rulesFields';
import { makeKit } from './kits/Kit';
import { makeHowTo } from './howtos/howToDocument';

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

/**
 * Every `hasOnly([...])` list of field *names* in a chunk of rules, in source order.
 *
 * Lists with nothing quoted in them are skipped: `values().hasOnly([null])` says what
 * a field's contents must be, not which fields a write may carry, and counting it as
 * an opening would make a create guard look like one.
 */
function hasOnlyLists(rules: string): string[][] {
    return Array.from(rules.matchAll(/hasOnly\(\[([^\]]*)\]\)/g))
        .map((match) =>
            Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g)).map((f) => f[1]),
        )
        .filter((list) => list.length > 0);
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

    test('and a gallery create carries each of them at its initial value', () => {
        // The create guard names the same fields but compares against literals
        // rather than against `resource.data`, so it reads differently and the
        // test above cannot see it. Without this, the two guards could drift and
        // a field would be owned on update and free on create — which is exactly
        // the state #1352 found.
        const block_ = block('galleries');
        const guard = block_.slice(
            block_.indexOf('function galleryServerFieldsInitial'),
        );
        const fields = new Set(
            Array.from(
                guard
                    .slice(0, guard.indexOf('}'))
                    .matchAll(/request\.resource\.data\.(\w+)/g),
            ).map((match) => match[1]),
        );
        expect(Array.from(fields).toSorted()).toEqual(
            [...GalleryServerOwnedFields].toSorted(),
        );
    });

    test('the kit rules and KitServerOwnedFields name the same fields', () => {
        // Both kit guards, because they read differently and each can drift from the
        // other: `kitServerFieldsUnchanged` compares against what is stored, and
        // `kitServerFieldsInitial` against literals, since a create has nothing stored.
        // A field owned on update and free on create is exactly the state #1352 found.
        for (const guard of [
            'kitServerFieldsUnchanged',
            'kitServerFieldsInitial',
        ]) {
            const b = block('kits');
            const start = b.indexOf(`function ${guard}`);
            const body = b.slice(start, b.indexOf('}', start));
            const fields = new Set(
                Array.from(
                    body.matchAll(/request\.resource\.data\.(\w+)/g),
                ).map((match) => match[1]),
            );
            expect(Array.from(fields).toSorted(), guard).toEqual(
                [...KitServerOwnedFields].toSorted(),
            );
        }
    });

    test('the how-to rules and HowToServerOwnedFields name the same fields', () => {
        // Both guards, for the reason the kit's pair is checked: a field owned on
        // update and free on create is exactly the state #1352 found.
        for (const guard of [
            'howToServerFieldsUnchanged',
            'howToServerFieldsInitial',
        ]) {
            const b = block('howtos');
            const start = b.indexOf(`function ${guard}`);
            expect(start, guard).toBeGreaterThan(-1);
            const body = b.slice(start, b.indexOf('}', start));
            // Two spellings, because the how-to guards read the incoming document
            // through `.get(field, default)`: every how-to written before #906
            // lacks these fields, and a bare access to a missing property is a hard
            // CEL error rather than a null — it would refuse the create a
            // still-open tab from the previous release sends.
            const fields = new Set(
                Array.from(
                    body.matchAll(
                        /request\.resource\.data\.(?:get\("(\w+)"|(\w+))/g,
                    ),
                )
                    .map((match) => match[1] ?? match[2])
                    .filter((field) => field !== 'get'),
            );
            expect(Array.from(fields).toSorted(), guard).toEqual(
                [...HowToServerOwnedFields].toSorted(),
            );
        }
    });

    test('a new how-to arrives at the values its create rule requires', () => {
        // The create guard says what each server-owned field must *be*, and a
        // how-to built any other way is refused — silently, and forever.
        const howTo = makeHowTo({
            creator: 'owner',
            galleryId: 'gallery',
            published: false,
            xcoord: 0,
            ycoord: 0,
            collaborators: [],
            title: '',
            guidingQuestions: [],
            text: [],
            locales: [],
            reactionTypes: {},
            notify: false,
            overwriteAccessScope: false,
            isPublic: false,
        });
        expect(howTo.moderation).toBe('unrequested');
        expect(howTo.moderatedAt).toBeNull();
        expect(Object.values(howTo.flags).every((f) => f === null)).toBe(true);
        // Never asking on arrival either: a how-to created already submitted
        // would be a creator putting themselves in the queue at creation.
        expect(howTo.submittedToGuide).toBe(false);
    });

    test('a new kit arrives at the values its create rule requires', () => {
        // Naming the fields is not enough: the create guard also says what each must
        // *be*, and a kit built any other way would simply be refused, silently, forever.
        const kit = makeKit('id', 'owner', 'owner/colors', '', null);
        expect(kit.moderation).toBe('unrequested');
        expect(kit.moderatedAt).toBeNull();
        expect(Object.values(kit.flags).every((f) => f === null)).toBe(true);
        expect(kit.words).toEqual([]);
        expect(kit.aliases).toEqual([]);
    });
});
