import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkDegenerateNames, { degeneracy } from './checkDegenerateNames';

/**
 * The real corruption this was written for: forty-six names in kn-IN and te-IN where a
 * translator asked to translate a symbol looped on it, drifted into Devanagari, and was cut
 * off mid-token. `checkNames` passed every one of them, because a garbled name has no spaces
 * and so is a single valid token.
 */

/** `output.Shape.names` is `["⬟","Shape"]` in en-US. */
const ShapeNames = new LocalePath(['output', 'Shape'], 'names', []);

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

function fix(names: string[], path = ShapeNames): unknown {
    const target = copyLocale();
    path.repair(target, names);
    return path.resolve(
        checkDegenerateNames(collectingLog().log, DefaultLocale, target, true),
    );
}

function complaints(names: string[], path = ShapeNames): string[] {
    const target = copyLocale();
    path.repair(target, names);
    const { log, lines } = collectingLog();
    checkDegenerateNames(log, DefaultLocale, target, false);
    return lines;
}

test('the names that were actually in kn-IN and te-IN are all caught', () => {
    // Verbatim, from static/locales/{kn-IN,te-IN}.json before the repair.
    for (const garbled of ['⬟कालिकसंपालिक⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟�', '⬟कालिक⬟कालि�'])
        expect(degeneracy(garbled, ['⬟', 'Shape'])).toBeDefined();

    expect(degeneracy('💬💬💬', ['💬', 'Phrase'])).toBeDefined();
    expect(degeneracy('💬💬తెలుగు', ['💬', 'Phrase'])).toBeDefined();
    expect(degeneracy('⚛️कालिक', ['⚛️', 'Matter'])).toBeDefined();
    expect(degeneracy('🔘ಟ್ರಾನ್ಸಿಟ್', ['🔘', 'Choice'])).toBeDefined();
    expect(degeneracy('📐ದಶಾ', ['📐', 'rotation'])).toBeDefined();
});

test('a real word with a doubled letter is not garbled', () => {
    // Every one of these is a legitimate name in a shipping locale, and an earlier, looser
    // version of this check flagged all of them.
    expect(degeneracy('멍멍', ['🐕', 'dog'])).toBeUndefined();
    expect(degeneracy('汪汪', ['🐕', 'dog'])).toBeUndefined();
    expect(degeneracy('五音音階', ['pentatonic'])).toBeUndefined();
    expect(degeneracy('서서히나타나기', ['fadein'])).toBeUndefined();
    expect(degeneracy('전기기타', ['electricGuitar'])).toBeUndefined();
});

test('an alphabetic en-US name is not used as a probe', () => {
    // These honest translations each contain the en-US name as a substring; only *symbolic*
    // en-US names are evidence of a mangled symbol.
    expect(degeneracy('tangente', ['tan'])).toBeUndefined();
    expect(degeneracy('cosseno', ['cos'])).toBeUndefined();
    expect(degeneracy('Volumen', ['Volume'])).toBeUndefined();
    expect(degeneracy('segmento', ['segment'])).toBeUndefined();
});

test('the en-US symbol itself is fine, and so is an ordinary translation', () => {
    expect(degeneracy('⬟', ['⬟', 'Shape'])).toBeUndefined();
    expect(degeneracy('ಆಕಾರ', ['⬟', 'Shape'])).toBeUndefined();
    expect(complaints(['⬟', 'Shape'])).toEqual([]);
});

test('a garbled name goes when the locale keeps a name of its own', () => {
    expect(fix(['$~⬟कालिक⬟कालि�', '$~ಆಕಾರ'])).toEqual(['$~ಆಕಾರ']);
    // Which is exactly what kn-IN and te-IN now hold.
});

test('with nothing else to be known by, it is marked unwritten rather than dropped', () => {
    // Removing it would leave the concept nameless in this language and erase the evidence
    // that it still needs a person.
    expect(fix(['$~⬟कालिक�'])).toEqual(['$?⬟कालिक�']);
});

test('an unwritten name does not count as one to fall back on', () => {
    expect(
        fix(
            ['$~💬💬💬', '$?ನುಡಿಗಟ್ಟು'],
            new LocalePath(['output', 'Phrase'], 'names', []),
        ),
    ).toEqual(['$?💬💬💬', '$?ನುಡಿಗಟ್ಟು']);
});
