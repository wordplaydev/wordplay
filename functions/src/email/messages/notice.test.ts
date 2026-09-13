import type { SerializedNotice } from 'shared-types';
import { describe, expect, test } from 'vitest';
import { noticeCopy } from './notice.js';

/**
 * The email's own copy, which is not the notification bell's.
 *
 * These run without a locale, so every case exercises the compiled-in English
 * — which is also what an English reader actually gets, since en-US is bundled
 * into the app rather than served from /locales.
 */

function notice(over: Partial<SerializedNotice> = {}): SerializedNotice {
    return {
        id: 'n1',
        kind: 'reported',
        subject: { kind: 'project', id: 'p1', gallery: null },
        title: 'My paint program',
        time: 1,
        ...over,
    };
}

describe('a subject line', () => {
    test('names the kind rather than the title', async () => {
        // A mailbox truncates, and which *sort* of thing it was is what tells
        // someone whether to open it. The title is inside.
        const copy = await noticeCopy(notice(), undefined);
        expect(copy.subject).toBe('Your project was reported');
    });

    test.each([
        ['gallery', 'Your gallery was reported'],
        ['howto', 'Your how-to was reported'],
        ['character', 'Your character was reported'],
        ['kit', 'Your kit was reported'],
        ['chat', 'Your chat was reported'],
    ] as const)('for a %s', async (kind, expected) => {
        const copy = await noticeCopy(
            notice({ subject: { kind, id: 'x', gallery: null } }),
            undefined,
        );
        expect(copy.subject).toBe(expected);
    });

    test('stays short enough for a mailbox list', async () => {
        for (const kind of [
            'reported',
            'report-received',
            'decision',
            'outcome',
            'warning',
            'review-requested',
            'gallery-listed',
            'howto-published',
        ] as const) {
            const copy = await noticeCopy(
                notice({ kind, count: 1 }),
                undefined,
            );
            expect(
                copy.subject.split(/\s+/).length,
                `${kind}: "${copy.subject}"`,
            ).toBeLessThanOrEqual(7);
        }
    });

    test('a report you filed is not your work being reported', async () => {
        // The distinction this grouping exists for. `report-received` says your
        // own report arrived; sharing `reported`'s subject would tell someone
        // their work had been reported when it was someone else's.
        const received = await noticeCopy(
            notice({ kind: 'report-received' }),
            undefined,
        );
        const reported = await noticeCopy(
            notice({ kind: 'reported' }),
            undefined,
        );
        expect(received.subject).not.toBe(reported.subject);
        expect(received.subject).not.toMatch(/your project/i);
    });
});

describe('the sentence inside', () => {
    test('is a whole sentence, ending in a period', async () => {
        // The bell's wording has no terminal punctuation, because it is a list
        // item. Borrowing it is what put an unfinished sentence in an email.
        for (const kind of [
            'reported',
            'report-received',
            'decision',
            'outcome',
            'warning',
            'gallery-listed',
            'howto-published',
        ] as const) {
            const copy = await noticeCopy(
                notice({ kind, count: 2 }),
                undefined,
            );
            expect(copy.headline, kind).toMatch(/\.$/);
        }
    });

    test('carries the title, which the subject dropped', async () => {
        const copy = await noticeCopy(notice(), undefined);
        expect(copy.headline).toContain('My paint program');
    });

    test('and fills a plural arm for a warning', async () => {
        const one = await noticeCopy(
            notice({ kind: 'warning', count: 1 }),
            undefined,
        );
        const three = await noticeCopy(
            notice({ kind: 'warning', count: 3 }),
            undefined,
        );
        expect(one.headline).toContain('warning 1');
        expect(three.headline).toContain('warning 3');
    });
});

describe('the tilted heading', () => {
    test('is a few words, not the sentence', async () => {
        const copy = await noticeCopy(notice(), undefined);
        expect(copy.heading).toBe('Reported');
    });

    test.each([
        ['decision', 'Moderation decision'],
        ['outcome', 'Moderation decision'],
        ['kit-listed', 'Listing decision'],
        ['howto-published', 'New how-to'],
        ['chat-message', 'New chats'],
    ] as const)('%s reads as %s', async (kind, expected) => {
        const copy = await noticeCopy(notice({ kind }), undefined);
        expect(copy.heading).toBe(expected);
    });
});
