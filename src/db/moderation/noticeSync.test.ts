import type {
    DerivedNoticeKind,
    NoticeKind,
    ReportSubjectKind,
    WrittenNoticeKind,
} from 'shared-types';
import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import {
    MaxNotices,
    NoticeKinds,
    NoticeSchema,
    NoticeSubjectKinds,
    WrittenNoticeKinds,
    toNotices,
} from './Notice';

/**
 * `functions/` compiles with rootDir "src" and so cannot import this schema;
 * the union it carries is a type, which cannot be enumerated at runtime, so the
 * runtime list here is a hand-kept mirror.
 *
 * A kind added on one side only is silent in the worst way: the server writes a
 * notice the client drops on parse, so a creator is told nothing and nothing
 * says why. Fail here instead.
 */
test('every runtime kind is a kind the shared type knows', () => {
    // The compile-time half: a kind missing from shared-types fails to build.
    const shared: NoticeKind[] = [...NoticeKinds];
    expect(shared.length).toBe(NoticeKinds.length);
});

test('the written kinds are a subset of all of them', () => {
    const written: WrittenNoticeKind[] = [...WrittenNoticeKinds];
    for (const kind of written) expect(NoticeKinds).toContain(kind);
});

test('every kind is either written or derived, and never both', () => {
    // The split decides whether a notice is delivered or re-derived, so a kind
    // in neither list would simply never appear.
    const derived: DerivedNoticeKind[] = [
        'chat-message',
        'howto-published',
        'gallery-listed',
        'gallery-denied',
        'kit-listed',
        'kit-denied',
        'warning',
    ];
    const all = [...WrittenNoticeKinds, ...derived];
    expect(all.toSorted()).toEqual([...NoticeKinds].toSorted());
});

/**
 * Every reportable kind, as a record so a kind added to `ReportSubjectKind` and not
 * here is a *compile* error. The runtime half is the test below.
 */
const EveryReportableKind: Record<ReportSubjectKind, true> = {
    project: true,
    gallery: true,
    chat: true,
    howto: true,
    character: true,
    kit: true,
};

test('a notice can be about every kind of thing that can be reported', () => {
    // The gap this closes was silent and total: `NoticeSubjectKinds` had no 'kit', so
    // `toNotices` dropped every notice about one on read — a decision, an outcome, a
    // review request — while Firestore held them all. Nobody was ever told anything
    // about a kit (#8). The kind enum had a sync test; its *subject* enum did not.
    expect([...NoticeSubjectKinds].sort()).toEqual(
        Object.keys(EveryReportableKind).sort(),
    );
});

test('a notice about each subject kind survives being read back', () => {
    for (const kind of NoticeSubjectKinds) {
        const read = toNotices({
            v: 1,
            notices: [
                {
                    id: `n-${kind}`,
                    kind: 'decision',
                    subject: { kind, id: 'x', gallery: null },
                    title: 'A thing',
                    time: 1,
                },
            ],
            dismissed: [],
            readAt: 0,
        });
        expect(read?.notices.map((n) => n.id)).toEqual([`n-${kind}`]);
    }
});

test('the schema accepts every kind the list declares', () => {
    for (const kind of NoticeKinds)
        expect(
            NoticeSchema.safeParse({
                id: 'n',
                kind,
                subject: { kind: 'project', id: 'p', gallery: null },
                title: '',
                time: 0,
            }).success,
        ).toBe(true);
});

test('the inbox cap matches the one the server trims to', () => {
    // Read as text, not imported: nothing in src/ imports a value from
    // shared-types, whose package.json points `main` at a file that isn't
    // there. If the server trimmed to a different number, the client would
    // render a list it thinks is complete and isn't.
    const source = readFileSync(
        path.join(process.cwd(), 'functions/src/shared/index.ts'),
        'utf-8',
    );
    const match = source.match(/export const MAX_NOTICES = (\d+)\s*;/);
    expect(match, 'MAX_NOTICES not found in functions').not.toBeNull();
    expect(Number(match?.[1])).toBe(MaxNotices);
});
