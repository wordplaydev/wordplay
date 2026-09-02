import Project from '@db/projects/Project';
import { localizeKeyName } from '@input/Key/Key';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Source from '@nodes/Source';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import LocalePath from '@util/verify-locales/LocalePath';
import fs from 'fs';
import { expect, test } from 'vitest';
import {
    retargetExampleNames,
    retargetExamplesIn,
    retargetSerializedExample,
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
/** What el-GR declares for an input right now. Read rather than written into the test, so
 *  choosing a better word for a locale doesn't turn a mechanism test into a vocabulary test. */
function declared(path: LocalePath, text: LocaleText = Greek): string {
    const value = path.resolve(text);
    const names = Array.isArray(value) ? value : [value];
    const word = names.find(
        (name): name is string =>
            typeof name === 'string' && /\p{L}/u.test(name),
    );
    if (word === undefined) throw new Error(`no name at ${path.toString()}`);
    return word.replace(/^(?:\$[?!~])+/, '');
}

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
    expect(result.code).toBe(`Φράση('ένα' ${declared(PhraseBubble)}: 'γεια!')`);
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
    expect(result.code).toBe(`Φράση('ένα' ${declared(PhraseBubble)}: 'γεια!')`);
});

test('a locale that already agrees is left alone, and the repair is idempotent', () => {
    const already = `Φράση('ένα' ${declared(PhraseBubble)}: 'γεια!')`;
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

/** `output.Place.names` — renaming a type strands references, not inputs. */
const Place = new LocalePath(['output', 'Place'], 'names', []);

test('a reference that still names the right definition is left alone', () => {
    // A localized example may use any of a definition's names, and they lean on the symbolic
    // ones constantly. Rewriting every reference to the declared word would have changed
    // 12,027 examples, nearly all of them for the worse.
    const example = "Φράση('ένα' θέση: 📍(0m 0m))";
    expect(
        retargetExampleNames(
            "Phrase('a' place: 📍(0m 0m))",
            example,
            Greek,
            'el',
        ).kind,
    ).toBe('unchanged');
});

test('an infix operator keeps its symbol', () => {
    expect(retargetExampleNames('1 + 2', '1 + 2', Greek, 'el').kind).toBe(
        'unchanged',
    );
});

test('a reference that stopped naming its definition is retargeted', () => {
    // What renaming a type does to every example that named it — the reason the Hebrew
    // vowel-point strip needed this pass first.
    const renamed = withNames(Greek, 'EE', Place, ['Τοποθεσία']);
    const result = retargetExampleNames(
        'Place(0m 0m)',
        'Θέση(0m 0m)',
        renamed,
        'el',
    );
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.code).toBe('Τοποθεσία(0m 0m)');
});

test('a name the example declares itself is never retargeted', () => {
    // It is the creator's word, translated with the example; the basis is all this pass owns.
    const example = 'θέση: 1\nθέση + 1';
    expect(
        retargetExampleNames('place: 1\nplace + 1', example, Greek, 'el').kind,
    ).toBe('unchanged');
});

test('renaming a type carries its inputs along in the same pass', () => {
    // The input's bind is resolved through the basis counterparts, not through the localized
    // example's own reference — which a rename has just stopped resolving. Before that, the
    // reference was repaired and the input beside it was left stranded.
    const renamed = withNames(Greek, 'FI', Place, ['Τοποθεσία']);
    const result = retargetExampleNames(
        'Place(0m 0m).offset(place: Place(1m 1m))',
        'Θέση(0m 0m).μετατόπιση(θέση: Θέση(1m 1m))',
        renamed,
        'el',
    );
    // Whatever else it does, it must not leave a reference naming nothing.
    expect(result.kind === 'retargeted' || result.kind === 'unchanged').toBe(
        true,
    );
    if (result.kind === 'retargeted')
        expect(result.code).not.toContain('Θέση(');
});

/**
 * Language tags are the one thing localizing an example takes away: a `Translation`, `Name`, or
 * `Doc` keeps its text and loses its `Language`. Several en-US examples exist to *teach* tags, so
 * every locale shipped the lesson with its subject missing, and re-translating reproduced it.
 */

test('a tag naming the source language comes back as the reader’s', () => {
    const result = retargetExampleNames(
        '"Language"/en',
        "'Γλώσσα'",
        Greek,
        'el',
    );
    expect(result.kind === 'retargeted' && result.code).toBe("'Γλώσσα'/el");
});

test('a tag naming another language comes back as en-US wrote it', () => {
    // `'hola'/es` is Spanish for every reader, so a translation of it is a mistake — and one
    // locales made: sr-RS shipped `конничива` where en-US has `こんにちは`.
    const result = retargetExampleNames(
        "['hello'/en 'hola'/es]",
        "['γεια' 'χόλα']",
        Greek,
        'el',
    );
    expect(result.kind === 'retargeted' && result.code).toBe(
        "['γεια'/el 'hola'/es]",
    );
});

test('an option the localizer dropped is restored', () => {
    // `withOnlyLanguage` keeps the option whose text gets translated and drops the rest.
    const result = retargetExampleNames(
        "'hello'/en'hola'/es-MX",
        "'γεια'",
        Greek,
        'el',
    );
    expect(result.kind === 'retargeted' && result.code).toBe(
        "'γεια'/el'hola'/es-MX",
    );
});

test('a name the localizer dropped is restored, keeping the name the locale chose', () => {
    // The locale's own word may carry a collision-avoiding suffix; that is its name now, and
    // restoring en-US's would reintroduce the conflict the suffix resolved.
    const result = retargetExampleNames(
        "cat/en, gato/es: '🐈'\nPhrase(cat)",
        "γάτα2: '🐈'\nΦράση(γάτα2)",
        Greek,
        'el',
    );
    expect(result.kind === 'retargeted' && result.code).toBe(
        "γάτα2/el, gato/es: '🐈'\nΦράση(γάτα2)",
    );
});

test('prose reflowed inside a doc is not divergence', () => {
    // Markup emits one `Words` token per line, so a translation that joined en-US's paragraph
    // onto one line has fewer nodes while its code is untouched. Every locale's
    // `choose-adventure` how-to read as divergent for this reason alone.
    const result = retargetExampleNames(
        '¶One line.\nAnother line.¶\nPhrase(1)',
        '¶Μία γραμμή. Άλλη γραμμή.¶\nΦράση(1)',
        Greek,
        'el',
    );
    expect(result.kind).not.toBe('divergent');
});

test('a restore that would break the example is refused', () => {
    // A locale whose own word already *is* the other language's would get a duplicate name:
    // es-MX translates `cat` to `gato`, which is exactly what en-US's second option says.
    const result = retargetExampleNames(
        "cat/en, gato/es: '🐈'\nPhrase(cat)",
        "gato: '🐈'\nΦράση(gato)",
        Greek,
        'el',
    );
    expect(result.kind === 'retargeted' && result.code).not.toContain(
        'gato/es, gato',
    );
});

// The multi-source counterpart (#1310): a whole localized `.wp`, sources
// paired positionally, resolution in the full project so `↓ borrow`s work.

test('a multi-source example is retargeted inside the full project', () => {
    const en = [
        {
            names: 'start',
            code: "↓ words\nPhrase(words[1] bubble: 'hello!')\n",
        },
        { names: 'words', code: "['fox' 'cow']\n" },
    ];
    const lo = [
        {
            names: 'start',
            code: "↓ words\nΦράση(words[1] φούσκα: 'γεια!')\n",
        },
        { names: 'words', code: "['αλεπού' 'αγελάδα']\n" },
    ];
    const result = retargetSerializedExample(en, lo, Greek, 'el');
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.sources[0].code).toBe(
        `↓ words\nΦράση(words[1] ${declared(PhraseBubble)}: 'γεια!')\n`,
    );
    // The borrowed source is untouched, and header names ride through.
    expect(result.sources[1]).toEqual(lo[1]);
});

test('a multi-source example that already agrees is unchanged', () => {
    const en = [
        {
            names: 'start',
            code: "↓ words\nPhrase(words[1] bubble: 'hello!')\n",
        },
        { names: 'words', code: "['fox' 'cow']\n" },
    ];
    const lo = [
        {
            names: 'start',
            code: `↓ words\nΦράση(words[1] ${declared(PhraseBubble)}: 'γεια!')\n`,
        },
        { names: 'words', code: "['αλεπού' 'αγελάδα']\n" },
    ];
    expect(retargetSerializedExample(en, lo, Greek, 'el').kind).toBe(
        'unchanged',
    );
});

test('a master that gained a source makes the whole file divergent', () => {
    const en = [
        { names: 'start', code: "Phrase('a' bubble: 'hello!')\n" },
        { names: 'extra', code: '1\n' },
    ];
    const lo = [{ names: 'start', code: "Φράση('ένα' bubble: 'γεια!')\n" }];
    expect(retargetSerializedExample(en, lo, Greek, 'el').kind).toBe(
        'divergent',
    );
});

test('one misaligned source makes the whole file divergent', () => {
    // The second source's shape changed; a partial repair would leave the file
    // half old and half new, so the whole file is what re-translates.
    const en = [
        { names: 'start', code: "Phrase('a' bubble: 'hello!')\n" },
        { names: 'words', code: "['fox' 'cow']\n" },
    ];
    const lo = [
        { names: 'start', code: "Φράση('ένα' bubble: 'γεια!')\n" },
        { names: 'words', code: "['αλεπού']\n" },
    ];
    expect(retargetSerializedExample(en, lo, Greek, 'el').kind).toBe(
        'divergent',
    );
});

test('a compared key name left in English is repaired to the locale display name', () => {
    // The pipeline once protected `key = "Space"` from translation and shipped
    // it verbatim — but the Key stream reports the PRIMARY locale's display
    // name, so the comparison never matched (WhatWord's space bar, #1310).
    // The repair reads the same table the stream does.
    const expected = localizeKeyName(
        ' ',
        Project.make(
            null,
            't',
            new Source('start', '1'),
            [],
            Greek,
        ).getLocales(),
    );
    expect(expected).not.toBe('Space');
    const en = [
        { names: 'start', code: `key: Key()\nstarted: key = 'Space'\n` },
    ];
    const lo = [
        { names: 'start', code: `key: Key()\nstarted: key = 'Space'\n` },
    ];
    const result = retargetSerializedExample(en, lo, Greek, 'el');
    expect(result.kind).toBe('retargeted');
    if (result.kind !== 'retargeted') return;
    expect(result.sources[0].code).toContain(`'${expected}'`);
});

test('a key name already in the locale display form is left alone', () => {
    const expected = localizeKeyName(
        ' ',
        Project.make(
            null,
            't',
            new Source('start', '1'),
            [],
            Greek,
        ).getLocales(),
    );
    const en = [
        { names: 'start', code: `key: Key()\nstarted: key = 'Space'\n` },
    ];
    const lo = [
        {
            names: 'start',
            code: `key: Key()\nstarted: key = '${expected}'\n`,
        },
    ];
    expect(retargetSerializedExample(en, lo, Greek, 'el').kind).toBe(
        'unchanged',
    );
});
