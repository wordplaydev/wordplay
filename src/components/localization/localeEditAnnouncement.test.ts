import { expect, test } from 'vitest';
import DefaultLocales from '#locale/DefaultLocales.ts';
import { localeEditAnnouncement } from './localeEditAnnouncement';

/** A queued announcement identical to the last one is dropped, so two saves in a row must
 *  read differently or the second is silent. */
test('saving two different edits announces two different things', () => {
    const first = localeEditAnnouncement(DefaultLocales, {
        kind: 'saved',
        text: 'hola',
        at: 1,
    });
    const second = localeEditAnnouncement(DefaultLocales, {
        kind: 'saved',
        text: 'adiós',
        at: 2,
    });
    expect(first.kind).toBe('locale-edit');
    expect(first.message).not.toBe(second.message);
    expect(second.message).toContain('adiós');
});

test('a failed save goes on the lane that repeats itself', () => {
    expect(
        localeEditAnnouncement(DefaultLocales, {
            kind: 'failed',
            text: 'hola',
            at: 1,
        }).kind,
    ).toBe('ignored');
});

test('a long edit is announced by its first words', () => {
    const { message } = localeEditAnnouncement(DefaultLocales, {
        kind: 'reverted',
        text: 'word '.repeat(40),
        at: 1,
    });
    expect(message.length).toBeLessThan(120);
    expect(message).toContain('…');
});
