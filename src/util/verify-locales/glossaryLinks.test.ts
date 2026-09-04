import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import {
    ExcludedTerms,
    getGlossaryWords,
    getLinkedTermIds,
    linkFirstUse,
    linkGlossaryInTutorial,
} from '@util/verify-locales/glossaryLinks';
import { expect, test } from 'vitest';
import type Tutorial from '../../tutorial/Tutorial';

const words = getGlossaryWords(DefaultLocale);

/** Link into a fresh unit, so each case starts with nothing introduced. */
function link(text: string): string | undefined {
    return linkFirstUse(text, words, new Set());
}

test('introduces a term the first time it appears, and only then', () => {
    expect(link('A stream of text, and then another stream.')).toBe(
        'A @stream of text, and then another stream.',
    );
});

test('a term already introduced in this unit is left alone', () => {
    const introduced = new Set<string>();
    expect(linkFirstUse('A stream.', words, introduced)).toBe('A @stream.');
    expect(linkFirstUse('Another stream.', words, introduced)).toBeUndefined();
});

test('an inflected form links as one whole word', () => {
    expect(link('These streams are new.')).toBe('These @streams are new.');
});

test('leaves code examples alone', () => {
    expect(link('Evaluate \\Time()\\ to make a stream.')).toBe(
        'Evaluate \\Time()\\ to make a @stream.',
    );
    expect(link('Shown here: \\a stream\\')).toBeUndefined();
});

test('does not link inside a subconcept reference', () => {
    // Regression for #960: `CONCEPT_RE` matched only the head of a reference,
    // so `name` in `@Phrase.name` was rewritten to `@Phrase.@name`, breaking it.
    for (const text of ['@Phrase.name is unique.', 'Dropped by @Track.key.'])
        expect(link(text)).toBeUndefined();
});

test('does not link inside an existing reference or a language tag', () => {
    expect(link('A @stream of @Text/en words.')).toBeUndefined();
});

test('skips an unwritten string, whose English is about to be replaced', () => {
    expect(link('$?A stream of text.')).toBeUndefined();
});

test('never links an excluded homograph', () => {
    // Every occurrence of these in the en-US tutorial was the verb.
    expect(ExcludedTerms.has('type')).toBe(true);
    expect(link('Did you type something?')).toBeUndefined();
    expect(link('I haven not named anything, so name things.')).toBeUndefined();
});

test('recognizes a term already linked by id or by a form', () => {
    expect(getLinkedTermIds('A @stream.', words).has('stream')).toBe(true);
    expect(getLinkedTermIds('Some @streams.', words).has('stream')).toBe(true);
    expect(getLinkedTermIds('A @Phrase.', words).has('stream')).toBe(false);
});

/** A tutorial of two scenes, each using the same word twice. */
function tutorialSaying(...scenes: string[][]): Tutorial {
    return {
        $schema: '',
        language: 'en',
        regions: ['US'],
        acts: [
            {
                title: 'Act',
                performance: { fit: '#Symbol 🕦' },
                scenes: scenes.map((lines, index) => ({
                    title: `Scene ${index}`,
                    subtitle: null,
                    performance: { fit: '#Symbol 🕦' },
                    lines: lines.map((line) => ['Time', 'neutral', line]),
                })),
            },
        ],
    } as Tutorial;
}

test('the scene is the unit, so a later scene introduces the word again', () => {
    // A reader lands on a scene and reads through it; someone who starts in the
    // middle still needs to meet the vocabulary that scene leans on.
    const { tutorial, changes } = linkGlossaryInTutorial(
        tutorialSaying(
            ['A stream ticks.', 'The stream ticks again.'],
            ['Another stream.'],
        ),
        DefaultLocale,
    );
    const said = (scene: number, line: number) =>
        (tutorial.acts[0].scenes[scene].lines[line] as string[])[2];
    expect(said(0, 0)).toBe('A @stream ticks.');
    expect(said(0, 1)).toBe('The stream ticks again.');
    expect(said(1, 0)).toBe('Another @stream.');
    expect(changes).toHaveLength(2);
});

test('a scene that already links a term elsewhere is left alone', () => {
    const { changes } = linkGlossaryInTutorial(
        tutorialSaying(['A stream ticks.', 'We met the @stream already.']),
        DefaultLocale,
    );
    expect(changes).toHaveLength(0);
});

test('every excluded term names a real term and gives a reason', () => {
    const glossary: LocaleText['glossary'] = DefaultLocale.glossary;
    for (const [id, reason] of ExcludedTerms) {
        expect(Object.keys(glossary)).toContain(id);
        expect(reason.length).toBeGreaterThan(0);
    }
});

test('leaves an example nested inside markup alone', () => {
    // Example spans pair by alternation, so `\`\'code'\`\` pairs its four
    // delimiters around `'code'` and exposes it; linking there put `@code`
    // inside a code example and broke it in 26 locales.
    expect(link("I can be:\n\\`\\'code'\\`\\")).toBeUndefined();
});
