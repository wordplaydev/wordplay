import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import fs from 'fs';
import { expect, test } from 'vitest';
import repairGlossaryWords, {
    checkGlossaryWordUsage,
    collectLocaleText,
    wellFormed,
} from './checkGlossaryWords';

/**
 * A glossary word has to be a word this locale's readers actually meet. These
 * read the locale JSON only, so a copy with one word changed behaves the way the
 * real file would.
 */

function locale(code: string): LocaleText {
    return JSON.parse(fs.readFileSync(getLocalePath(code), 'utf8'));
}

/** A deep copy of en-US with one glossary term's word (and forms) replaced. */
function withWord(id: string, word: string, forms?: string[]): LocaleText {
    const copy: LocaleText = JSON.parse(JSON.stringify(DefaultLocale));
    for (const [key, entry] of Object.entries(copy.glossary))
        if (key === id) {
            entry.word = word;
            if (forms !== undefined) entry.forms = forms;
        }
    return copy;
}

function repair(text: LocaleText, fix = true) {
    const { log, lines } = collectingLog();
    return { lines, revised: repairGlossaryWords(log, text, fix) };
}

/** The word `id` holds after a repair. */
function wordOf(text: LocaleText, id: string): string {
    for (const [key, entry] of Object.entries(text.glossary))
        if (key === id) return entry.word;
    throw new Error(`no term ${id}`);
}

test('a parenthetical gloss is removed', () => {
    // ta-IN-LK-SG appended the English to 22 of its words, which makes each one
    // unmatchable in prose and unwritable as a reference.
    const { revised } = repair(withWord('expression', 'கோவை (expression)'));
    expect(wordOf(revised, 'expression')).toBe('கோவை');
});

test('Hebrew vowel points are removed', () => {
    // The rule `checkPointedNames` applies to names; glossary words never got it
    // because `word` is [plain] rather than NameText.
    const { revised } = repair(withWord('query', 'שְׁאֵלָה'));
    expect(wordOf(revised, 'query')).toBe('שאלה');
});

test('a reference left inside a word is removed', () => {
    const { revised } = repair(withWord('start', 'पेहला @Source'));
    expect(wordOf(revised, 'start')).toBe('पेहला');
});

test('the write-status marker survives the repair', () => {
    // 37 of the 38 malformed words are machine translated; dropping the marker
    // would quietly claim they had been reviewed.
    const { revised } = repair(withWord('expression', '$~கோவை (expression)'));
    expect(wordOf(revised, 'expression')).toBe('$~கோவை');
});

test('forms are repaired on the same rules', () => {
    const { revised } = repair(
        withWord('expression', 'கோவை', ['கோவைகள் (expressions)']),
    );
    for (const [key, entry] of Object.entries(revised.glossary))
        if (key === 'expression') expect(entry.forms).toEqual(['கோவைகள்']);
});

test('a repair that would collide with another term is refused', () => {
    // `getGlossaryFormIndex` maps one folded form to one id, so a collision
    // makes a reference silently ambiguous.
    const collide = withWord('expression', 'value (expression)');
    const { revised, lines } = repair(collide);
    expect(wordOf(revised, 'expression')).toBe('value (expression)');
    expect(lines.some((line) => line.includes('already claims'))).toBe(true);
});

test('a well-formed word is left exactly alone', () => {
    const { revised, lines } = repair(DefaultLocale);
    expect(JSON.stringify(revised.glossary)).toBe(
        JSON.stringify(DefaultLocale.glossary),
    );
    expect(lines).toEqual([]);
});

test('wellFormed is idempotent', () => {
    for (const word of ['கோவை (expression)', 'שְׁאֵלָה', 'पेहला @Source'])
        expect(wellFormed(wellFormed(word))).toBe(wellFormed(word));
});

/** Run the usage check against en-US's own text as both sides. */
function usage(target: LocaleText, text: string) {
    const { log, lines } = collectingLog();
    checkGlossaryWordUsage(
        log,
        DefaultLocale,
        target,
        text,
        collectLocaleText(DefaultLocale, []),
    );
    return lines;
}

test('a word the locale never writes is reported', () => {
    const lines = usage(
        withWord('scope', 'Gültigkeitsbereich'),
        'nothing here',
    );
    expect(lines.some((line) => line.includes('Gültigkeitsbereich'))).toBe(
        true,
    );
});

test('a word the locale does write is not reported', () => {
    const lines = usage(
        withWord('scope', 'Gültigkeitsbereich'),
        'der Gültigkeitsbereich eines Namens',
    );
    expect(lines.some((line) => line.includes('Gültigkeitsbereich'))).toBe(
        false,
    );
});

test('an inflected occurrence counts, since matching is substring', () => {
    // Which is what lets this degrade correctly in agglutinative languages and
    // unspaced scripts, where `glossaryLinks` deliberately declines.
    const lines = usage(withWord('scope', 'kapsam'), 'kapsamı içinde');
    expect(lines.some((line) => line.includes('kapsam'))).toBe(false);
});

test('a word only repeated from en-US is skipped', () => {
    // French `expression` and German `Code` legitimately are the English.
    const lines = usage(DefaultLocale, 'nothing here');
    expect(lines).toEqual([]);
});

test('an excluded homograph is never reported', () => {
    const lines = usage(withWord('type', 'Typ'), 'nothing here');
    expect(lines.some((line) => line.includes('Typ'))).toBe(false);
});

test('the glossary block never counts as using its own word', () => {
    // Otherwise every word would trivially find itself in its own entry.
    expect(collectLocaleText(DefaultLocale, [])).not.toContain(
        DefaultLocale.glossary.sideEffect.definition,
    );
});

test('the locales as they ship report nothing repairable', () => {
    // A regression guard: once the 38 are repaired, a new malformed word should
    // fail here rather than sit in the corpus unnoticed.
    for (const code of ['ta-IN-LK-SG', 'he-IL', 'hi-IN', 'de-DE']) {
        const { lines } = repair(locale(code), false);
        expect(lines, code).toEqual([]);
    }
});
