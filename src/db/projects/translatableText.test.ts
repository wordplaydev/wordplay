import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import { stringToLocale } from '@locale/Locale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import translateProjectContent, {
    type RawTranslator,
} from './translateProjectContent';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A translator that translates every string it's given, so a test can tell what
 *  was offered to it apart from what was left alone. */
function shouting(): RawTranslator {
    return async (texts) => texts.map((t) => `«${t}»`);
}

/** Translate a program and return both what was sent to the translator and the
 *  revised source. */
async function translate(code: string) {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const project = Project.make(
        null,
        'test',
        new Source('start', code),
        [],
        DefaultLocale,
    );
    const sent: string[] = [];
    const result = await translateProjectContent(
        project,
        en,
        es,
        async (texts, from, to, context) => {
            sent.push(...texts);
            return shouting()(texts, from, to, context);
        },
        undefined,
        true,
    );
    return { sent, out: result?.getSources()[0]?.toWordplay() ?? '' };
}

test('a key name compared against a stream is left alone', async () => {
    // The Heart Attack bug (#1276): translating these literals and then making
    // the target locale primary means the comparison never matches again, and
    // the game stops responding to the keyboard.
    const { sent, out } = await translate(
        `key: Key()
(key = 'ArrowLeft') ? 1 ((key = 'Enter') ? 2 3)`,
    );
    expect(sent).not.toContain('ArrowLeft');
    expect(sent).not.toContain('Enter');
    expect(out).toContain("'ArrowLeft'");
    expect(out).toContain("'Enter'");
});

test('the other operand of a comparison is left alone too', async () => {
    const { sent } = await translate(`a: 'left'\n(a ≠ 'right')`);
    expect(sent).not.toContain('right');
});

test('an emoji-only literal is left alone', async () => {
    // A model asked to translate '🫀' will happily return a word, which then
    // renders as text on the stage instead of a heart.
    const { sent, out } = await translate(`Phrase('🫀')`);
    expect(sent).not.toContain('🫀');
    expect(out).toContain('🫀');
});

test('a map key is left alone', async () => {
    const { sent } = await translate(`sounds: {'meow': 1 'woof': 2}`);
    expect(sent).not.toContain('meow');
    expect(sent).not.toContain('woof');
});

test('prose in a phrase is still translated', async () => {
    const { sent, out } = await translate(`Phrase('hello')`);
    expect(sent).toContain('hello');
    expect(out).toContain('«hello»');
});

test('a concatenated string is still translated', async () => {
    // Only the direct operand of a comparison is data; text being built up is
    // prose, even when the result is later compared.
    const { sent } = await translate(`name: 'world'\n('hello ' + name)`);
    expect(sent).toContain('hello ');
});
