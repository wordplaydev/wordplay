import en from '@locale/en-US.json';
import { describe, expect, test } from 'vitest';
import { CollectionSteps } from './AccountSnapshot';

/**
 * The export's progress announcement must say something different every time it
 * fires, or it is heard once and then sounds broken (#152).
 *
 * An unchanged live region is silent — VoiceOver offers no way to force a
 * re-announcement — so a message that reads the same twice in a row is a
 * message a creator hears once, from which the export appears to have stopped.
 * The message names the kind just collected *and* the running count, and this
 * is what holds both halves in place: the count alone repeats whenever two
 * collections in a row are empty, which for most creators is most of them.
 */

const text = en.ui.page.login.export;

/** Every step the progress message can name, including the two after the
 *  reads. */
const Steps = [...CollectionSteps, 'archive', 'saving'];

describe('export progress', () => {
    test('names both the kind and the count', () => {
        expect(text.progress).toContain('$kind');
        expect(text.progress).toContain('$count');
    });

    test('has a name for every step', () => {
        expect(Object.keys(text.kind).sort()).toEqual([...Steps].sort());
    });

    test('never gives two steps the same name', () => {
        // Two steps sharing a word would make the message repeat exactly when
        // the count has not moved, which is the silence this rule exists for.
        const names = Object.values(text.kind);
        expect(new Set(names).size).toBe(names.length);
    });

    test('distinguishes a whole finish from a partial one', () => {
        // Both are announced on the same lane, and an export that half-worked
        // must not sound like one that worked.
        expect(text.finished).not.toBe(text.finishedPartial);
    });

    test('says something different at each end of the run', () => {
        expect(text.started).not.toBe(text.finished);
    });
});
