import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { CLDR_VERSION } from '@util/verify-locales/cldr';
import { parseUnicodeSet } from '@util/verify-locales/generateExemplars';

test('parseUnicodeSet parses the shapes CLDR exemplar sets use', () => {
    // English main: simple space-separated members.
    expect(
        parseUnicodeSet(
            '[a b c d e f g h i j k l m n o p q r s t u v w x y z]',
        ),
    ).toHaveLength(26);

    // German main: juxtaposed runs like aä are separate members.
    const german = parseUnicodeSet(
        '[aä b c d e f g h i j k l m n oö p q r s ß t uü v w x y z]',
    );
    expect(german).toContain('a');
    expect(german).toContain('ä');
    expect(german).toContain('ß');
    expect(german).not.toContain('aä');

    // Slovak main: braced clusters are single multi-codepoint members.
    const slovak = parseUnicodeSet('[a b č {ch} {dž} h]');
    expect(slovak).toContain('ch');
    expect(slovak).toContain('dž');
    expect(slovak).toContain('č');

    // Ranges expand codepoint by codepoint.
    expect(parseUnicodeSet('[a-e]')).toEqual(['a', 'b', 'c', 'd', 'e']);

    // Escapes: literal and \uXXXX (as in CLDR numbers sets).
    expect(parseUnicodeSet('[\\- \\u00E9]')).toEqual(['-', 'é']);

    // Astral members stay whole.
    expect(parseUnicodeSet('[𐌰 a]')).toEqual(['𐌰', 'a']);
});

test('parseUnicodeSet throws loudly on unsupported syntax', () => {
    expect(() => parseUnicodeSet('[[:L:]]')).toThrow();
    expect(() => parseUnicodeSet('[{ch]')).toThrow();
    expect(() => parseUnicodeSet('a b c')).toThrow();
});

test('the committed exemplars artifact matches the pinned CLDR version and expectations', () => {
    const artifact: unknown = JSON.parse(
        readFileSync(
            path.join(process.cwd(), 'static', 'unicode', 'exemplars.json'),
            'utf-8',
        ),
    );
    if (
        artifact === null ||
        typeof artifact !== 'object' ||
        !('cldr' in artifact) ||
        !('locales' in artifact) ||
        artifact.locales === null ||
        typeof artifact.locales !== 'object'
    )
        throw new Error('Malformed exemplars.json');

    expect(artifact.cldr).toBe(CLDR_VERSION);

    const pools = new Map(
        Object.entries(artifact.locales).map(([id, joined]) => [
            id,
            typeof joined === 'string' ? joined.split(' ') : [],
        ]),
    );

    // English is exactly its alphabet, digits, and uppercase — no loanword
    // accents (those are CLDR's auxiliary set, deliberately excluded).
    const en = pools.get('en');
    expect(en).toBeDefined();
    for (const c of ['a', 'z', 'A', 'Z', '0', '9'])
        expect(en).toContain(c);
    for (const c of ['é', 'ü', 'ö', 'ñ']) expect(en).not.toContain(c);

    // German includes its umlauts and eszett with uppercase forms.
    const de = pools.get('de');
    for (const c of ['ä', 'ö', 'ü', 'ß', 'Ä', 'SS']) expect(de).toContain(c);

    // Slovak includes its digraphs, uppercased too.
    const sk = pools.get('sk');
    expect(sk).toContain('ch');
    expect(sk).toContain('CH');

    // Turkish gets its dotted/dotless i pairs right.
    const tr = pools.get('tr');
    for (const c of ['i', 'ı', 'İ', 'I']) expect(tr).toContain(c);

    // Traditional Chinese has its own pool.
    expect(pools.has('zh_Hant')).toBe(true);
});
