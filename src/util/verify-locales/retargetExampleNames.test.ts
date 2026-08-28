import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import LocalePath from '@util/verify-locales/LocalePath';
import fs from 'fs';
import { expect, test } from 'vitest';
import {
    retargetExampleNames,
    retargetExamplesIn,
} from './retargetExampleNames';

/**
 * A localized example spells names that live at *other* locale paths, so re-translating one
 * of those names strands the example on the word that was declared when it was localized —
 * #1323's `UnknownInput`. These check that the example is re-derived from what the locale
 * declares now, and that a repair never makes an example worse.
 */

function locale(code: string): LocaleText {
    return JSON.parse(fs.readFileSync(getLocalePath(code), 'utf8'));
}

const Greek = locale('el-GR');
const German = locale('de-DE');

/** `output.Phrase.bubble.names` — the input #1323 was found on. */
const PhraseBubble = new LocalePath(
    ['output', 'Phrase', 'bubble'],
    'names',
    [],
);

/**
 * A copy of a locale with one name changed — and a region nobody uses, because
 * `Basis.getLocalizedBasis` memoizes on the locale's language and regions, so a copy that
 * keeps them silently gets the unmodified locale's basis and the test proves nothing.
 */
function withNames(
    text: LocaleText,
    region: string,
    path: LocalePath,
    names: string[],
): LocaleText {
    const copy: LocaleText = JSON.parse(JSON.stringify(text));
    path.repair(copy, names);
    return { ...copy, regions: [region] };
}

test('an input left on a word the locale no longer declares is retargeted', () => {
    // el-GR declares `φυσαλίδα`; `φούσκα` is what `Bubble` the *type* is called, which is
    // the word the example was localized with before the input's name was re-translated.
    const result = retargetExampleNames(
        "Phrase('a' bubble: 'hello!')",
        "Φράση('ένα' φούσκα: 'γεια!')",
        Greek,
        'el',
    );
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.code).toBe("Φράση('ένα' φυσαλίδα: 'γεια!')");
    expect(result.renamed).toBe(1);
});

test('an input still spelled in English is retargeted too', () => {
    // The same defect, quieter: it binds only because every basis appends en-US.
    const result = retargetExampleNames(
        "Phrase('a' bubble: 'hello!')",
        "Φράση('ένα' bubble: 'γεια!')",
        Greek,
        'el',
    );
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.code).toBe("Φράση('ένα' φυσαλίδα: 'γεια!')");
});

test('a locale that already agrees is left alone, and the repair is idempotent', () => {
    const already = "Φράση('ένα' φυσαλίδα: 'γεια!')";
    expect(
        retargetExampleNames(
            "Phrase('a' bubble: 'hello!')",
            already,
            Greek,
            'el',
        ).kind,
    ).toBe('unchanged');
});

test('an example whose shape no longer matches en-US is left alone', () => {
    // The en-US example gained an input this one doesn't have, so there is no pairing to
    // make; guessing would rename against an unrelated node.
    expect(
        retargetExampleNames(
            "Phrase('a' bubble: 'hello!')",
            "Φράση('ένα')",
            Greek,
            'el',
        ).kind,
    ).toBe('divergent');
});

test('an input the locale has not named keeps the word it has', () => {
    // Falling through to a name from somewhere else would be worse than the English one an
    // untranslated input still carries.
    const unnamed = withNames(Greek, 'CY', PhraseBubble, []);
    expect(
        retargetExampleNames(
            "Phrase('a' bubble: 'hello!')",
            "Φράση('ένα' bubble: 'γεια!')",
            unnamed,
            'el',
        ).kind,
    ).toBe('unchanged');
});

test('the name comes from the locale, not from the example', () => {
    // The whole point: change what the locale declares and the example follows, which is the
    // re-derivation that #1323's stranded examples never got.
    const renamed = withNames(Greek, 'CZ', PhraseBubble, ['συννεφάκι']);
    const result = retargetExampleNames(
        "Phrase('a' bubble: 'hello!')",
        "Φράση('ένα' φούσκα: 'γεια!')",
        renamed,
        'el',
    );
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.code).toBe("Φράση('ένα' συννεφάκι: 'γεια!')");
});

test('a name is retargeted inside a doc, keeping its markup and annotations', () => {
    const source = "Give me a bubble:\n\n\\Phrase('a' bubble: 'hello!')\\";
    const localized = "Gib mir eine Blase:\n\n\\Phrase('a' bubble: 'hallo!')\\";
    const result = retargetExamplesIn(source, localized, German);
    expect(result.renamed).toBe(1);
    expect(result.text).toContain('Gib mir eine Blase:');
    expect(result.text).toContain('\\Phrase(');
    expect(result.text).not.toContain('bubble:');
});

test('an unwritten string is left alone', () => {
    // Its example is English on purpose; half-retargeting it makes a program in no language.
    const source = "\\Phrase('a' bubble: 'hello!')\\";
    const localized = "$?\\Phrase('a' bubble: 'hello!')\\";
    expect(retargetExamplesIn(source, localized, German).text).toBe(localized);
});

test('an example carrying an emoji presentation selector keeps it', () => {
    // Re-serializing an example would drop U+FE0F, since the tokenizer strips it from the
    // source it reads. The repair splices name spans instead, so the selector survives —
    // and where it can't, the example is left alone rather than rewritten without it.
    const source = "\\Phrase('🖐️' bubble: 'hello!')\\";
    const localized = "\\Phrase('🖐️' bubble: 'hallo!')\\";
    const result = retargetExamplesIn(source, localized, German);
    expect(result.text).toContain('🖐️');
});

test('en-US is its own source, so nothing changes', () => {
    const example = "Phrase('a' bubble: 'hello!')";
    expect(
        retargetExampleNames(example, example, DefaultLocale, 'en').kind,
    ).toBe('unchanged');
});
