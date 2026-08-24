import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import { expect, test } from 'vitest';

/**
 * A live region only speaks when its text changes, so a recurring announcement
 * whose wording is constant is heard once and then sounds broken. Translation
 * announces four times over one run — start, progress, progress, finish — and
 * the easiest way to get this wrong is a summary that reads correctly and says
 * the same words every time. Asserting one message's content would pass happily
 * while the feature was inaudible, so assert that consecutive messages differ.
 */
const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);

test('a translation run says something different each time it speaks', () => {
    const started = locales
        .concretize((l) => l.ui.translation.started, {
            count: 80,
            language: 'Spanish',
        })
        .toText();
    const first = locales
        .concretize((l) => l.ui.translation.progress, { done: '25', total: 80 })
        .toText();
    const second = locales
        .concretize((l) => l.ui.translation.progress, { done: '50', total: 80 })
        .toText();
    const finished = locales
        .concretize((l) => l.ui.translation.finished, { language: 'Spanish' })
        .toText();

    const spoken = [started, first, second, finished];
    expect(new Set(spoken).size).toBe(spoken.length);
});

test('a partly translated project says so differently from a fully translated one', () => {
    const finished = locales
        .concretize((l) => l.ui.translation.finished, { language: 'Spanish' })
        .toText();
    const partial = locales
        .concretize((l) => l.ui.translation.finishedPartial, {
            language: 'Spanish',
            kept: 3,
        })
        .toText();
    expect(partial).not.toBe(finished);
});

test('the budget meter reads differently as it is spent', () => {
    const early = locales
        .concretize((l) => l.ui.translation.used, { used: '0', limit: 10000 })
        .toText();
    const later = locales
        .concretize((l) => l.ui.translation.used, {
            used: '1400',
            limit: 10000,
        })
        .toText();
    expect(early).not.toBe(later);
    // The two numbers must stay legibly apart. Wordplay markup eats some
    // punctuation — a `/` between them opens italics, which is how this string
    // first rendered as "010000".
    expect(later).toMatch(/1400\D+10000/);
});
