import type { SerializedNotice } from 'shared-types';
import { describe, expect, test } from 'vitest';
import noticeLink, { noticeAction } from './noticeLink';

function notice(over: Partial<SerializedNotice> = {}): SerializedNotice {
    return {
        id: 'n1',
        kind: 'chat-message',
        subject: { kind: 'project', id: 'p1', gallery: null },
        title: 'A project',
        time: 1,
        ...over,
    };
}

describe('noticeLink', () => {
    test('a project notice opens the project', () => {
        expect(noticeLink(notice())).toBe('/project/p1');
    });

    test('a gallery notice opens the gallery', () => {
        expect(
            noticeLink(
                notice({
                    subject: { kind: 'gallery', id: 'g1', gallery: 'g1' },
                }),
            ),
        ).toBe('/gallery/g1');
    });

    test('a how-to notice opens it inside its gallery', () => {
        expect(
            noticeLink(
                notice({ subject: { kind: 'howto', id: 'h1', gallery: 'g1' } }),
            ),
        ).toBe('/gallery/g1/howto?id=h1');
    });

    test('a how-to with no gallery falls back rather than linking to a 404', () => {
        expect(
            noticeLink(
                notice({ subject: { kind: 'howto', id: 'h1', gallery: null } }),
            ),
        ).toBe('/galleries');
    });

    test("a project's chat opens the project, gallery or not", () => {
        expect(
            noticeLink(
                notice({ subject: { kind: 'chat', id: 'p1', gallery: null } }),
            ),
        ).toBe('/project/p1');
    });

    test("a how-to's chat opens the how-to", () => {
        expect(
            noticeLink(
                notice({ subject: { kind: 'chat', id: 'h1', gallery: 'g1' } }),
            ),
        ).toBe('/gallery/g1/howto?id=h1');
    });

    test('a kit notice opens that kit, not the registry', () => {
        // A notice carries the kit's id and nothing else, and the kit page takes either
        // an id or a `username/name` — a name always has a `/`, so they can't collide.
        // Sending a creator to the registry instead of to the kit a decision was about
        // is the wrong destination, and for a kit that was just unlisted it is a page
        // that deliberately no longer shows it.
        expect(
            noticeLink(
                notice({
                    subject: { kind: 'kit', id: 'k1', gallery: null },
                }),
            ),
        ).toBe('/guide?kit=k1');
    });
});

describe('noticeAction', () => {
    test('a warning leads to the rules it is about, not to a project', () => {
        expect(noticeAction(notice({ kind: 'warning' }))).toBe('/rights');
    });

    test('a request for review leads to the queue', () => {
        expect(noticeAction(notice({ kind: 'review-requested' }))).toBe(
            '/moderate',
        );
    });

    test('everything else just goes to its subject', () => {
        for (const kind of ['chat-message', 'decision', 'outcome'] as const)
            expect(noticeAction(notice({ kind }))).toBeUndefined();
    });
});
