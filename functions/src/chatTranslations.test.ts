import { FieldValue } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { forgetMessageTranslations } from './chatTranslations.js';

/**
 * Evicting a hidden message's cached translations (#1214).
 *
 * A translation is a copy of the words, so a takedown that leaves one behind
 * has hidden only the original — and the reported sentence stays readable to
 * every participant in whichever language they last asked for. That is the same
 * mistake as leaving the text in the chat behind a client-side `{#if}`, which is
 * what #938 was about, so it is pinned here rather than trusted.
 */

type Update = { path: string; field: unknown; value: unknown };

/** Just enough Firestore to watch what this writes. */
function fakeFirestore(languages: string[], commitFails = false) {
    const updates: Update[] = [];
    let committed = false;
    const db = {
        collection: (name: string) => ({
            doc: (id: string) => ({
                collection: (sub: string) => ({
                    get: async () => ({
                        empty: languages.length === 0,
                        docs: languages.map((language) => ({
                            ref: { path: `${name}/${id}/${sub}/${language}` },
                        })),
                    }),
                }),
            }),
        }),
        batch: () => ({
            update: (ref: { path: string }, field: unknown, value: unknown) => {
                updates.push({ path: ref.path, field, value });
            },
            commit: async () => {
                if (commitFails) throw new Error('offline');
                committed = true;
            },
        }),
    };
    return { db, updates, committed: () => committed };
}

describe('forgetMessageTranslations', () => {
    it('forgets a message in every language the chat has cached', async () => {
        const { db, updates, committed } = fakeFirestore(['es-MX', 'zh-TW']);
        await forgetMessageTranslations(db, 'chat-1', 'message-1');

        expect(updates.map((u) => u.path)).toEqual([
            'chats/chat-1/translations/es-MX',
            'chats/chat-1/translations/zh-TW',
        ]);
        expect(updates.every((u) => u.value === FieldValue.delete())).toBe(
            true,
        );
        expect(committed()).toBe(true);
    });

    it('names the field once, unparsed', async () => {
        // A FieldPath rather than a computed `{[id]: …}` key, whose keys are
        // read as dotted paths — so an id that ever stops being a UUID could
        // otherwise start addressing something nested.
        const { db, updates } = fakeFirestore(['es-MX']);
        await forgetMessageTranslations(db, 'chat-1', 'a.b.c');
        expect(String(updates[0].field)).toContain('a.b.c');
    });

    it('writes nothing when the chat has no translations', async () => {
        const { db, updates, committed } = fakeFirestore([]);
        await forgetMessageTranslations(db, 'chat-1', 'message-1');
        expect(updates).toHaveLength(0);
        expect(committed()).toBe(false);
    });

    it('does not fail the takedown when the cache will not tidy up', async () => {
        // The report or the decision has already landed by the time this runs.
        // Refusing a takedown because a cache misbehaved would be the wrong way
        // round.
        const { db } = fakeFirestore(['es-MX'], true);
        await expect(
            forgetMessageTranslations(db, 'chat-1', 'message-1'),
        ).resolves.toBeUndefined();
    });
});
