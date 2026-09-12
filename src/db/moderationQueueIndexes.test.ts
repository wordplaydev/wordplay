import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * Every moderator queue's query needs a composite index, and the emulator will not tell
 * you when one is missing.
 *
 * `ModerationQueue` runs `where('moderation','==','pending')` with an `orderBy` on a
 * different field, which Firestore serves only from a composite index — but the emulator
 * creates them on demand, so a missing one is invisible in every local run and every e2e
 * run, and surfaces in production as a `FAILED_PRECONDITION` the queue catches. Kits
 * shipped without theirs for exactly that reason.
 *
 * Listed by hand rather than derived, because the `order` lives in a Svelte prop and
 * parsing that would be worse than restating it: a queue added here is a queue whose index
 * someone had to think about.
 */
const QueueIndexes: [string, string, 'ASCENDING' | 'DESCENDING'][] = [
    ['galleries', 'id', 'ASCENDING'],
    ['kits', 'updated', 'DESCENDING'],
];

test.each(QueueIndexes)(
    'the %s moderator queue has an index for its ordering',
    (collection, field, order) => {
        const indexes: {
            collectionGroup: string;
            fields: { fieldPath: string; order?: string }[];
        }[] = JSON.parse(
            readFileSync('firestore.indexes.json', 'utf8'),
        ).indexes;

        expect(
            indexes.some(
                (index) =>
                    index.collectionGroup === collection &&
                    index.fields.length === 2 &&
                    index.fields[0].fieldPath === 'moderation' &&
                    index.fields[0].order === 'ASCENDING' &&
                    index.fields[1].fieldPath === field &&
                    index.fields[1].order === order,
            ),
            `firestore.indexes.json needs ${collection} (moderation ASC, ${field} ${order === 'ASCENDING' ? 'ASC' : 'DESC'})`,
        ).toBe(true);
    },
);
