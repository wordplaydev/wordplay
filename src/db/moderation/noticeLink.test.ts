import type { SerializedNotice } from 'shared-types';
import { describe, expect, test } from 'vitest';
// The server's own copy, which an email uses to build the link it sends.
// `functions/` compiles with its own `rootDir` and can't import this side; this
// side can import it, which is what lets one table hold both to the same
// contract. A drift would mail someone a link to somewhere else.
import {
    noticeAction as actionOnServer,
    noticeLink as linkOnServer,
} from '../../../functions/src/noticeLink';
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

describe('the server builds the same links', () => {
    // Every subject kind, and every kind whose destination is somewhere other
    // than its subject, so a new one on either side has to be added to both.
    const subjects: SerializedNotice['subject'][] = [
        { kind: 'project', id: 'p1', gallery: null },
        { kind: 'gallery', id: 'g1', gallery: 'g1' },
        { kind: 'howto', id: 'h1', gallery: null },
        { kind: 'howto', id: 'h1', gallery: 'g1' },
        { kind: 'chat', id: 'c1', gallery: null },
        { kind: 'chat', id: 'c1', gallery: 'g1' },
        { kind: 'character', id: 'ch1', gallery: null },
        { kind: 'kit', id: 'amy/colors', gallery: null },
    ];

    const kinds: SerializedNotice['kind'][] = [
        'review-requested',
        'reported',
        'report-received',
        'decision',
        'outcome',
        'warning',
        'chat-message',
        'howto-published',
        'gallery-listed',
        'gallery-denied',
        'kit-listed',
        'kit-denied',
        'howto-listed',
        'howto-denied',
    ];

    test.each(subjects)('%o leads to the same place', (subject) => {
        expect(linkOnServer(notice({ subject }))).toBe(
            noticeLink(notice({ subject })),
        );
    });

    test.each(kinds)('%s acts in the same place', (kind) => {
        expect(actionOnServer(notice({ kind }))).toBe(
            noticeAction(notice({ kind })),
        );
    });
});
