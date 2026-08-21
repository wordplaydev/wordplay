import { MachineTranslated, Revised } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { getCheckablePathKinds, findLostConceptLinks } from './drift';
import { expect, test } from 'vitest';

/** A minimal locale-shaped pair of objects sharing one real doc path. */
function pair(english: string | string[], translated: string | string[]) {
    const make = (doc: string | string[]) =>
        ({ output: { Say: { doc } } }) as unknown as LocaleText;
    const source = make(english);
    const target = make(translated);
    return {
        source,
        target,
        lost: findLostConceptLinks(
            'xx-XX',
            'xx.json',
            getCheckablePathKinds(source),
            source as unknown as Record<string, unknown>,
            target as unknown as Record<string, unknown>,
        ),
    };
}

test('a link translated into a plain word is reported', () => {
    // The shipped failure: "@value" became "Wertes", so the reader loses the
    // link, and checkDocContent never notices because it only verifies that the
    // links a doc *has* resolve.
    const { lost } = pair(
        ['I show a @value on the @Stage.'],
        [`${MachineTranslated}Ich zeige einen Wert auf der @Stage.`],
    );
    expect(lost).toHaveLength(1);
    expect(lost[0].id).toBe('output.Say.doc');
});

test('a translation that kept every link is not reported', () => {
    const { lost } = pair(
        ['I show a @value on the @Stage.'],
        [`${MachineTranslated}Ich zeige einen @value auf der @Stage.`],
    );
    expect(lost).toEqual([]);
});

test('a source with no links is never reported', () => {
    const { lost } = pair(['Plain prose.'], [`${MachineTranslated}Klartext.`]);
    expect(lost).toEqual([]);
});

test('an already queued string is left for the translator', () => {
    // It is going to be re-translated anyway; marking it again would stack.
    const { lost } = pair(
        ['I show a @value.'],
        [`${Revised}Ich zeige einen Wert.`],
    );
    expect(lost).toEqual([]);
});

test('links are compared across a whole markup array, not per paragraph', () => {
    // A markup array is one document; a link may legitimately move between
    // paragraphs when a language reorders the sentence.
    const { lost } = pair(
        ['A @value.', 'On the @Stage.'],
        [`${MachineTranslated}Auf der @Stage.`, 'Ein @value.'],
    );
    expect(lost).toEqual([]);
});

test('a duplicated link counts as a mismatch', () => {
    const { lost } = pair(
        ['I show a @value.'],
        [`${MachineTranslated}Ich zeige @value und @value.`],
    );
    expect(lost).toHaveLength(1);
});
