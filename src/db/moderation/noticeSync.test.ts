import type {
    DerivedNoticeKind,
    NoticeKind,
    WrittenNoticeKind,
} from 'shared-types';
import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import {
    MaxNotices,
    NoticeKinds,
    NoticeSchema,
    WrittenNoticeKinds,
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
        'warning',
    ];
    const all = [...WrittenNoticeKinds, ...derived];
    expect(all.toSorted()).toEqual([...NoticeKinds].toSorted());
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
