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
    // Oldest request first. `moderatedAt` rather than the how-to's `publishedAt`,
    // which is client-written and unclamped — `9e15` would pin one creator to the
    // top of a fairness queue forever — and rather than `id`, whose arbitrary but
    // stable order means twenty skipped how-tos hide everything behind them. The
    // trigger sets `moderatedAt` in the same write that reaches `pending`, so on a
    // queued how-to it is always there and always means "when it asked".
    ['howtos', 'moderatedAt', 'ASCENDING'],
];

/**
 * The guide's own query, which has the same hazard and no queue behind it.
 *
 * It filters on all three of `published`, `isPublic` and `moderation` rather than
 * on the decision alone, because Firestore denies a whole query when any document
 * it matches fails its read rule — so naming the fields the rule tests is what
 * keeps one withdrawn how-to from emptying the community group for every visitor.
 */
const RegistryIndex: [string, string[]] = [
    'howtos',
    ['published', 'isPublic', 'moderation', 'moderatedAt'],
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

test('the guide lists community how-tos from an index that exists', () => {
    const [collection, fields] = RegistryIndex;
    const indexes: {
        collectionGroup: string;
        fields: { fieldPath: string; order?: string }[];
    }[] = JSON.parse(readFileSync('firestore.indexes.json', 'utf8')).indexes;

    expect(
        indexes.some(
            (index) =>
                index.collectionGroup === collection &&
                index.fields.map((f) => f.fieldPath).join(',') ===
                    fields.join(','),
        ),
        `firestore.indexes.json needs ${collection} (${fields.join(', ')})`,
    ).toBe(true);
});
