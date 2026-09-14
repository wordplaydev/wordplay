import { isRecord } from '@util/guards';
import { must } from '@util/nullable';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Class } from './TeacherDatabase.svelte';

/** The fields a recorded write queued, checked rather than asserted, so a write
 *  that queued something other than a field map fails here. */
function fieldsOf(data: unknown): Record<string, unknown> {
    if (!isRecord(data)) throw new Error('a write with no fields');
    return data;
}

// Helpers shared by writeBatch and runTransaction mocks: each one records its
// queued operations so tests can assert on them.
type BatchOp = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastBatchOps: BatchOp[] = [];
let lastTransactionOps: BatchOp[] = [];
let transactionReadSnap: { exists: () => boolean; data: () => unknown } = {
    exists: () => false,
    data: () => ({}),
};

vi.mock('firebase/firestore', () => ({
    arrayUnion: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayUnion',
        elements,
    })),
    arrayRemove: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayRemove',
        elements,
    })),
    doc: vi.fn((_firestore: unknown, collection: string, id: string) => ({
        _ref: { collection, id },
    })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => {
        const ops: BatchOp[] = [];
        lastBatchOps = ops;
        return {
            set: vi.fn((ref: unknown, data: unknown) => {
                ops.push({ kind: 'set', ref, data });
            }),
            update: vi.fn((ref: unknown, data: unknown) => {
                ops.push({ kind: 'update', ref, data });
            }),
            delete: vi.fn((ref: unknown) => {
                ops.push({ kind: 'delete', ref });
            }),
            commit: vi.fn(async () => {}),
        };
    }),
    runTransaction: vi.fn(
        async (
            _firestore: unknown,
            fn: (tx: {
                get: (ref: unknown) => Promise<unknown>;
                set: (ref: unknown, data: unknown) => void;
                update: (ref: unknown, data: unknown) => void;
                delete: (ref: unknown) => void;
            }) => Promise<unknown>,
        ) => {
            const ops: BatchOp[] = [];
            lastTransactionOps = ops;
            await fn({
                get: async () => transactionReadSnap,
                set: (ref, data) => {
                    ops.push({ kind: 'set', ref, data });
                },
                update: (ref, data) => {
                    ops.push({ kind: 'update', ref, data });
                },
                delete: (ref) => {
                    ops.push({ kind: 'delete', ref });
                },
            });
        },
    ),
    collection: vi.fn(),
    query: vi.fn(),
    // Recorded rather than ignored, so getClasses' two membership queries can
    // be told apart — which is what firestore.rules now requires of them.
    where: vi.fn((field: string) => {
        lastQueriedFields.push(field);
    }),
    getDoc: vi.fn(async () => ({ exists: () => false })),
    getDocs: vi.fn(async () => ({ docs: [] })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

/** Who the mocked DB reports as signed in; getClasses gates its read on this. */
let currentUser: { uid: string } | null = null;

/** The fields each `where` clause named, in the order they were built. */
let lastQueriedFields: string[] = [];

// Galleries facade is exercised by removeTeacher/removeStudent for the
// curator-side cleanup, which we don't need to assert on here.
vi.mock('@db/Database', () => ({
    DB: {
        track: vi.fn(<T>(p: Promise<T>) => p),
        write: vi.fn(<T>(p: Promise<T>) => p),
        read: vi.fn(<T>(p: Promise<T>) => p),
        getUser: vi.fn(() => currentUser),
        reportLoadFailure: vi.fn(),
    },
    Galleries: {
        get: vi.fn(async () => undefined),
        removeCurator: vi.fn(async () => {}),
        removeCreator: vi.fn(async () => {}),
    },
}));

vi.mock('@db/galleries/GalleryDatabase.svelte', () => ({
    GalleriesCollection: 'galleries',
}));

import {
    addStudent,
    addTeacher,
    ClassSchema,
    getClasses,
    removeStudent,
    removeTeacher,
} from './TeacherDatabase.svelte';
import { getDocs } from 'firebase/firestore';

/** What the mocked `getDocs` resolves to: only `docs` is ever read. */
type Snapshot = Awaited<ReturnType<typeof getDocs>>;
function snapshot(classes: Class[]): Snapshot {
    const docs = classes.map((c) => ({ id: c.id, data: () => c }));
    return Object.assign(Object.create(null), { docs });
}
function noDocs(): Snapshot {
    return snapshot([]);
}

/** Make `getDocs` answer the `teachers` query with these classes and the
 *  `learners` query with none. */
function answerWith(classes: Class[]) {
    let call = 0;
    vi.mocked(getDocs).mockImplementation(async () =>
        call++ === 0 ? snapshot(classes) : noDocs(),
    );
}

function makeClass(overrides: Partial<Class> = {}): Class {
    return {
        id: 'class-1',
        name: 'Class',
        description: '',
        teachers: ['t1'],
        learners: ['s1'],
        info: [{ uid: 's1', username: 's1', meta: ['a', 'b'] }],
        galleries: ['g1', 'g2'],
        ...overrides,
    };
}

describe('getClasses', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // clearAllMocks keeps implementations, so a test that answers with
        // documents would otherwise answer for every test after it.
        vi.mocked(getDocs).mockImplementation(async () => noDocs());
        lastQueriedFields = [];
        currentUser = null;
    });

    it('asks for nothing while signed out', async () => {
        // firestore.rules only allows listing classes when signed in, so this
        // read can only ever be denied — and a denial on a gallery page every
        // signed-out visitor loads is not something to report.
        expect(await getClasses('g1')).toEqual([]);
        expect(getDocs).not.toHaveBeenCalled();
    });

    it('asks only for classes this creator is in', async () => {
        // A `galleries array-contains` query would return classes the caller
        // isn't in, and firestore.rules refuses a query whole if any document
        // it would return fails — so membership has to be in the query.
        currentUser = { uid: 't1' };
        expect(await getClasses('g1')).toEqual([]);
        expect(getDocs).toHaveBeenCalledTimes(2);
        expect(lastQueriedFields).toEqual(['teachers', 'learners']);
    });

    it('keeps only the classes associated with the gallery', async () => {
        currentUser = { uid: 't1' };
        answerWith([
            makeClass({ id: 'in', galleries: ['g1'] }),
            makeClass({ id: 'out', galleries: ['g2'] }),
        ]);
        expect((await getClasses('g1')).map((c) => c.id)).toEqual(['in']);
    });

    it('lists a class once when both queries return it', async () => {
        // A teacher listed among their own learners matches both.
        currentUser = { uid: 't1' };
        const only = makeClass({ id: 'both', galleries: ['g1'] });
        vi.mocked(getDocs).mockImplementation(async () => snapshot([only]));
        expect((await getClasses('g1')).map((c) => c.id)).toEqual(['both']);
    });
});

describe('TeacherDatabase atomic class & gallery updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentUser = { uid: 't1' };
        lastBatchOps = [];
        lastTransactionOps = [];
        transactionReadSnap = { exists: () => false, data: () => ({}) };
    });

    describe('addTeacher', () => {
        it('writes a single batch that arrayUnions the teacher into the class and each gallery curators list', async () => {
            await addTeacher(makeClass(), 't2');

            expect(lastBatchOps).toHaveLength(3);

            // Class write.
            expect(lastBatchOps[0]).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'classes', id: 'class-1' } },
                data: {
                    teachers: { _op: 'arrayUnion', elements: ['t2'] },
                },
            });
            // Each associated gallery's curators array.
            expect(lastBatchOps[1]).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'galleries', id: 'g1' } },
                data: {
                    curators: { _op: 'arrayUnion', elements: ['t2'] },
                },
            });
            expect(lastBatchOps[2]).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'galleries', id: 'g2' } },
                data: {
                    curators: { _op: 'arrayUnion', elements: ['t2'] },
                },
            });
        });
    });

    describe('addStudent', () => {
        it('arrayUnions the student into learners, info, and each gallery creators list', async () => {
            await addStudent(makeClass(), 's2', 's2-username');

            expect(lastBatchOps).toHaveLength(3);

            // Class write touches both learners and info, and matches the meta
            // shape of the existing learners (two empty strings).
            const classOp = lastBatchOps[0];
            expect(classOp).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'classes', id: 'class-1' } },
            });
            const classData = fieldsOf(must(classOp, 'the class write').data);
            expect(classData.learners).toEqual({
                _op: 'arrayUnion',
                elements: ['s2'],
            });
            expect(classData.info).toEqual({
                _op: 'arrayUnion',
                elements: [
                    { uid: 's2', username: 's2-username', meta: ['', ''] },
                ],
            });

            // Each gallery's creators list.
            expect(lastBatchOps[1]).toMatchObject({
                ref: { _ref: { collection: 'galleries', id: 'g1' } },
                data: { creators: { _op: 'arrayUnion', elements: ['s2'] } },
            });
            expect(lastBatchOps[2]).toMatchObject({
                ref: { _ref: { collection: 'galleries', id: 'g2' } },
                data: { creators: { _op: 'arrayUnion', elements: ['s2'] } },
            });
        });

        it('does not crash when adding the first student (empty info)', async () => {
            await expect(
                addStudent(makeClass({ info: [] }), 's2', 's2'),
            ).resolves.not.toThrow();

            const classData = fieldsOf(
                must(lastBatchOps[0], 'the class write').data,
            );
            expect(classData.info).toEqual({
                _op: 'arrayUnion',
                elements: [{ uid: 's2', username: 's2', meta: [] }],
            });
        });
    });

    describe('removeTeacher', () => {
        it('arrayRemoves the teacher from the class teachers list', async () => {
            await removeTeacher(makeClass(), 't1');

            // updateDoc is the field-only write; assert call args.
            const { updateDoc } = await import('firebase/firestore');
            expect(updateDoc).toHaveBeenCalledTimes(1);
            const [ref, data] = must(
                vi.mocked(updateDoc).mock.calls[0],
                'the updateDoc call asserted above',
            );
            expect(ref).toMatchObject({
                _ref: { collection: 'classes', id: 'class-1' },
            });
            expect(data).toEqual({
                teachers: { _op: 'arrayRemove', elements: ['t1'] },
            });
        });
    });

    describe('removeStudent', () => {
        it('uses a transaction that filters learners and info by uid', async () => {
            // Pretend the server doc has both s1 (to remove) and s2.
            transactionReadSnap = {
                exists: () => true,
                data: () => ({
                    id: 'class-1',
                    name: 'Class',
                    description: '',
                    teachers: ['t1'],
                    learners: ['s1', 's2'],
                    info: [
                        { uid: 's1', username: 's1', meta: ['a', 'b'] },
                        { uid: 's2', username: 's2', meta: ['c', 'd'] },
                    ],
                    galleries: ['g1'],
                }),
            };

            await removeStudent(makeClass(), 's1');

            // The transaction should have queued one update with the filtered arrays.
            expect(lastTransactionOps).toHaveLength(1);
            expect(lastTransactionOps[0]).toMatchObject({
                kind: 'update',
                ref: { _ref: { collection: 'classes', id: 'class-1' } },
                data: {
                    learners: ['s2'],
                    info: [{ uid: 's2', username: 's2', meta: ['c', 'd'] }],
                },
            });
        });
    });
});

describe('the class schema', () => {
    it('keeps an affirmation the server wrote', () => {
        // setClass writes the parsed object back, and zod strips keys it does
        // not declare — so an undeclared affirmation would be erased by the
        // teacher's first ordinary edit.
        const affirmed = {
            ...makeClass(),
            affirmation: { teacher: 't1', on: 1757000000000 },
        };
        expect(ClassSchema.parse(affirmed).affirmation).toEqual({
            teacher: 't1',
            on: 1757000000000,
        });
    });

    it('parses a class made before there were affirmations', () => {
        const parsed = ClassSchema.parse(makeClass());
        expect(parsed.affirmation).toBeUndefined();
        // Absent rather than present-and-undefined: setDoc refuses undefined.
        expect('affirmation' in parsed).toBe(false);
    });
});
