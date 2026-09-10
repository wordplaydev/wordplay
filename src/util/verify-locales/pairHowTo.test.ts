import { toMarkup } from '@parser/toMarkup';
import {
    examplesIn,
    pairHowToUnits,
    paragraphSignature,
    proseRunsIn,
} from '@util/verify-locales/pairHowTo';
import { describe, expect, it } from 'vitest';

function markup(text: string) {
    return toMarkup(text)[0];
}

function wordsIn(text: string): string[] {
    return proseRunsIn(markup(text)).map((token) => token.getText());
}

const English = [
    'Sometimes you want to show @Phrase content one piece at a time.',
    '',
    'Here is the smallest version of it:',
    '',
    "\\Phrase('first')\\",
    '',
    'The @Reaction is the heart of it.\nIt starts at one, and counts up.',
].join('\n');

describe('paragraphSignature', () => {
    it('ignores prose but keeps the untranslated marks around it', () => {
        const a = markup('Sometimes you want a @Phrase here.').paragraphs[0];
        const b = markup('Manchmal willst du ein @Phrase hier.').paragraphs[0];
        expect(paragraphSignature(a)).toBe(paragraphSignature(b));
    });

    it('separates paragraphs that reference different concepts', () => {
        const a = markup('A @Phrase here.').paragraphs[0];
        const b = markup('A @Group here.').paragraphs[0];
        expect(paragraphSignature(a)).not.toBe(paragraphSignature(b));
    });

    /**
     * The damage this pairing exists to repair merged a paragraph's prose runs,
     * so counting them would make every damaged paragraph unpairable and re-buy
     * its examples along with its prose.
     */
    it('treats a run of prose as one, however many lines it was written on', () => {
        const wrapped = markup('It starts at one.\nIt counts up.')
            .paragraphs[0];
        const flowed = markup('It starts at one. It counts up.').paragraphs[0];
        expect(paragraphSignature(wrapped)).toBe(paragraphSignature(flowed));
    });
});

describe('pairing an English how-to with an existing translation', () => {
    it('reuses every prose run of a translation that still matches', () => {
        const german = [
            'Manchmal willst du @Phrase Inhalte Stück für Stück zeigen.',
            '',
            'Hier ist die kleinste Version davon:',
            '',
            "\\Phrase('erstens')\\",
            '',
            'Die @Reaction ist das Herzstück.\nSie beginnt bei eins und zählt hoch.',
        ].join('\n');

        const { words, examples } = pairHowToUnits(
            markup(English),
            markup(german),
        );
        expect(words.size).toBe(wordsIn(English).length);
        expect(examples.size).toBe(1);
        expect([...words.values()]).toContain('Manchmal willst du ');
    });

    /** The #1365 case: English gained a paragraph the translation never had. */
    it('leaves a paragraph the translation is missing unpaired, so it is bought', () => {
        const short = [
            'Manchmal willst du @Phrase Inhalte Stück für Stück zeigen.',
            '',
            'Hier ist die kleinste Version davon:',
            '',
            "\\Phrase('erstens')\\",
        ].join('\n');

        const english = markup(English);
        const { words } = pairHowToUnits(english, markup(short));
        const unpaired = proseRunsIn(english).filter(
            (token) => !words.has(token),
        );
        expect(unpaired.length).toBeGreaterThan(0);
        expect(unpaired.map((token) => token.getText()).join('')).toContain(
            'is the heart of it',
        );
    });

    /**
     * A translation whose line breaks were eaten still has its examples in the
     * same places, so those are kept and only its prose is re-bought.
     */
    it('keeps the examples of a paragraph whose prose runs were merged', () => {
        const damaged = [
            'Manchmal willst du @Phrase Inhalte Stück für Stück zeigen.',
            '',
            'Hier ist die kleinste Version davon:',
            '',
            "\\Phrase('erstens')\\",
            '',
            'Die @Reaction ist das Herzstück.Sie beginnt bei eins.',
        ].join('\n');

        const english = markup(English);
        const { examples } = pairHowToUnits(english, markup(damaged));
        expect(examples.size).toBe(examplesIn(english).length);
    });

    it('pairs nothing when the translation shares no structure', () => {
        const { words, examples } = pairHowToUnits(
            markup(English),
            markup('Etwas völlig anderes mit @Group und @Stage.'),
        );
        expect(words.size).toBe(0);
        expect(examples.size).toBe(0);
    });
});
