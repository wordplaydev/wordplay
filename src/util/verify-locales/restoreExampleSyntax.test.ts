import { expect, test } from 'vitest';
import { codeShape, restoreExampleSyntax } from './restoreExampleSyntax';

/** Wrap a bare code span in the example delimiters the entries carry. */
const example = (code: string) => `We changed \\${code}\\ today.`;

test('a renamed definition is kept — that is the localization working', () => {
    // A German reader's basis says Rede(), so the example should say it too.
    for (const [before, after] of [
        ['Speech()', 'Rede()'],
        ['Sequence.sway()', 'Reihenfolge.wiegen()'],
        ['Color.random()', 'Farbe.zufällig()'],
        ['Phrase("hi" size: 2)', 'Phrase("hi" größe: 2)'],
    ])
        expect(
            restoreExampleSyntax(example(before), example(after)),
            `${before} → ${after} only renames`,
        ).toBe(example(after));
});

test('a dropped language tag is restored', () => {
    // The entry announcing that a tag may be written by name shipped as
    // 'hallo' three times in German, having lost all three tags — the lesson
    // without its subject.
    expect(
        restoreExampleSyntax(example("'hola'/Español"), example("'hallo'")),
    ).toBe(example("'hola'/Español"));
    expect(
        restoreExampleSyntax(example("'hello'/en"), example("'hallo'")),
    ).toBe(example("'hello'/en"));
});

test('spacing inserted into a locale code is restored', () => {
    // `fa-AF` and `fa - AF` tokenize identically; only the spacing says which
    // one is the locale code, which is why shape carries it.
    expect(restoreExampleSyntax(example('fa-AF'), example('fa - AF'))).toBe(
        example('fa-AF'),
    );
});

test('a character dropped from a pattern is restored', () => {
    const before = '"@amyjko" ≈ ⣿"@" >0 {_ #}⣿';
    const after = '"@amyjko" ≈ ⣿ " >0 {_ #}⣿';
    expect(restoreExampleSyntax(example(before), example(after))).toBe(
        example(before),
    );
});

test('prose around the example is never touched', () => {
    expect(
        restoreExampleSyntax(
            'You can write \\1‥10\\ now.',
            'Du kannst jetzt \\1‥10\\ schreiben.',
        ),
    ).toBe('Du kannst jetzt \\1‥10\\ schreiben.');
});

test('an entry with several examples repairs only the broken ones', () => {
    expect(
        restoreExampleSyntax(
            'Try \\Speech()\\ and \\fa-AF\\ and \\1‥10\\.',
            'Probiere \\Rede()\\ und \\fa - AF\\ und \\1‥10\\.',
        ),
    ).toBe('Probiere \\Rede()\\ und \\fa-AF\\ und \\1‥10\\.');
});

test('a mismatched delimiter count declines rather than guessing', () => {
    // reassemble already refuses these, so reaching here means something odd;
    // pairing odd indices across different counts would splice unrelated spans.
    expect(restoreExampleSyntax('a \\one\\ b \\two\\ c', 'a \\eins\\ b')).toBe(
        'a \\eins\\ b',
    );
});

test('an entry with no examples is returned unchanged', () => {
    expect(
        restoreExampleSyntax('We fixed a bug.', 'Wir haben es behoben.'),
    ).toBe('Wir haben es behoben.');
});

test('codeShape ignores names and keeps everything else', () => {
    expect(codeShape('Speech()')).toBe(codeShape('Rede()'));
    expect(codeShape('fa-AF')).not.toBe(codeShape('fa - AF'));
    expect(codeShape("'hola'/Español")).not.toBe(codeShape("'hallo'"));
});
