import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import {
    ExcludedTerms,
    findHomographTerms,
    getGlossaryWords,
    getLinkedTermIds,
    linkFirstUse,
    linkGlossaryInLocale,
    linkGlossaryInTutorial,
    unlinkReference,
} from '@util/verify-locales/glossaryLinks';
import { expect, test } from 'vitest';
import { isDialog, type Dialog, type Tutorial } from '../../tutorial/Tutorial';
import { must } from '@util/nullable';

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
                    lines: lines.map((line): Dialog => [
                        'Time',
                        'neutral',
                        line,
                    ]),
                })),
            },
        ],
    };
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
    const said = (scene: number, line: number) => {
        const spoken = must(
            must(must(tutorial.acts[0], 'an act').scenes[scene], 'a scene')
                .lines[line],
            'a line',
        );
        if (!isDialog(spoken)) throw new Error('Expected a dialog line');
        return spoken[2];
    };
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

/** en-US with `how` given a different word, as a translation might. */
function withHowWord(word: string): LocaleText {
    return {
        ...DefaultLocale,
        glossary: {
            ...DefaultLocale.glossary,
            how: { ...DefaultLocale.glossary.how, word },
        },
    };
}

test('a glossary word that is an everyday word in its locale is flagged', () => {
    // pt-PT translated "how-to" as "como", which is also "how", "as", and "like".
    const portuguese = withHowWord('como');
    const units = Array.from({ length: 20 }, (_, index) =>
        index % 2 === 0 ? 'Como funciona?' : 'Tão simples como isso.',
    );
    const flagged = findHomographTerms(
        DefaultLocale,
        ['Read the how-to.'],
        portuguese,
        units,
    );
    expect(flagged.get('how')).toEqual({
        word: 'como',
        locale: 20,
        english: 1,
    });
});

test('a term used about as often as in en-US is not flagged', () => {
    expect(
        findHomographTerms(
            DefaultLocale,
            ['A stream.', 'Another stream.'],
            DefaultLocale,
            ['A stream.', 'Another stream.', 'A third stream.'],
        ).has('stream'),
    ).toBe(false);
});

test('a suppressed term is never linked', () => {
    const portuguese = withHowWord('como');
    portuguese.node = structuredClone(DefaultLocale.node);
    portuguese.node.Paragraph.doc = ['Como funciona?'];
    // Unguarded, this is exactly the damage: the question word becomes the term.
    expect(linkGlossaryInLocale(portuguese).locale.node.Paragraph.doc).toEqual([
        '@how funciona?',
    ]);
    const { locale } = linkGlossaryInLocale(portuguese, new Set(['how']));
    expect(locale.node.Paragraph.doc).toEqual(['Como funciona?']);
});

test('a glossary word queued for translation is never linked', () => {
    expect(
        getGlossaryWords(withHowWord('$!como')).some(({ id }) => id === 'how'),
    ).toBe(false);
});

test('unlinking restores the word, capitalized where a sentence starts', () => {
    expect(
        unlinkReference('@how nos faz? Apenas isso.', 'how', 'como', 'pt'),
    ).toBe('Como nos faz? Apenas isso.');
    expect(
        unlinkReference(
            'Tão simples @how criar. @how funciona?',
            'how',
            'como',
            'pt',
        ),
    ).toBe('Tão simples como criar. Como funciona?');
});

test('unlinking lowers a capitalized word mid-sentence', () => {
    expect(
        unlinkReference(
            'ich weiß nur, @how Funktionen auswertet',
            'how',
            'Wie man',
            'de',
        ),
    ).toBe('ich weiß nur, wie man Funktionen auswertet');
});

test('unlinking leaves how-to links, members, and examples alone', () => {
    expect(
        unlinkReference(
            'See @how/add-image and \\@how\\.',
            'how',
            'como',
            'pt',
        ),
    ).toBe('See @how/add-image and \\@how\\.');
    expect(unlinkReference('@howto is not @how.', 'how', 'jak', 'pl')).toBe(
        '@howto is not jak.',
    );
});

test('unlinking a caseless script restores the word as is', () => {
    expect(unlinkReference('@how 만드나요?', 'how', '어떻게', 'ko')).toBe(
        '어떻게 만드나요?',
    );
});
