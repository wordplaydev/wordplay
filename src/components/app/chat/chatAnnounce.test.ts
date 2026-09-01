import DefaultLocales from '@locale/DefaultLocales';
import { describe, expect, test } from 'vitest';
import {
    foundAnnouncement,
    reactionAnnouncement,
    referenceAnnouncement,
    threadAnnouncement,
} from '@components/app/chat/chatAnnounce';

const locales = DefaultLocales;

/**
 * Every test here fires one announcement twice over different state and insists
 * the two differ. Asserting a single call's content passes happily while the
 * feature is inaudible: the queued lane drops a consecutive duplicate, so a
 * constant string is heard once and then sounds broken.
 */
describe('chat announcements vary between firings', () => {
    test('a reaction names the emoji and the new count', () => {
        const first = reactionAnnouncement(locales, '👍', 1, true);
        const second = reactionAnnouncement(locales, '👍', 2, true);
        expect(first).not.toEqual(second);
        // And a different emoji at the same count differs too, so two people
        // reacting differently to the same message are distinguishable.
        expect(first).not.toEqual(reactionAnnouncement(locales, '❤️', 1, true));
    });

    test('taking a reaction back is not the same as adding one', () => {
        expect(reactionAnnouncement(locales, '👍', 1, true)).not.toEqual(
            reactionAnnouncement(locales, '👍', 1, false),
        );
    });

    test('a thread names whose it is and how many replies', () => {
        expect(threadAnnouncement(locales, 'Amy', 2)).not.toEqual(
            threadAnnouncement(locales, 'Amy', 3),
        );
        expect(threadAnnouncement(locales, 'Amy', 2)).not.toEqual(
            threadAnnouncement(locales, 'Sujin', 2),
        );
    });

    test('a reference names the lines', () => {
        expect(referenceAnnouncement(locales, 'line 4')).not.toEqual(
            referenceAnnouncement(locales, 'line 5'),
        );
    });

    test('going to a message names who said it and how it starts', () => {
        // Pressing a marker is the recurring case: "went to the message" would
        // be the same words every time, and the queued lane drops a repeat.
        expect(
            foundAnnouncement(locales, 'Amy', 'this line is odd'),
        ).not.toEqual(foundAnnouncement(locales, 'Amy', 'this one is fine'));
        expect(foundAnnouncement(locales, 'Amy', 'same words')).not.toEqual(
            foundAnnouncement(locales, 'Sujin', 'same words'),
        );
    });

    test('a long message is cut short rather than recited', () => {
        const long = foundAnnouncement(
            locales,
            'Amy',
            'one two three four five six seven eight nine',
        );
        expect(long).toContain('…');
        expect(long).not.toContain('nine');
    });

    test('plural forms are chosen, so nothing says "1 replies"', () => {
        expect(threadAnnouncement(locales, 'Amy', 1)).toContain('1 reply');
        expect(threadAnnouncement(locales, 'Amy', 2)).toContain('2 replies');
    });
});
