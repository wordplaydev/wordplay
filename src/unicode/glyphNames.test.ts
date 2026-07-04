import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Guards the generated static/unicode data (`npm run codes`): that CJK ranges
 * are expanded so Han is browsable, and that glyph-names.txt carries Unicode
 * names for symbols/letters and Unihan definitions + pinyin for Han.
 */

function readNames(): Map<string, string[]> {
    const text = fs.readFileSync(
        path.join('static', 'unicode', 'glyph-names.txt'),
        'utf8',
    );
    const map = new Map<string, string[]>();
    for (const line of text.split('\n')) {
        if (!line || line.startsWith('#')) continue;
        const [key, ...values] = line.split('\t');
        if (key && values.length > 0) map.set(key, values);
    }
    return map;
}

describe('codes.txt CJK expansion', () => {
    test('中 (U+4E2D), an interior CJK ideograph, is enumerated', () => {
        const codes = fs.readFileSync(
            path.join('static', 'unicode', 'codes.txt'),
            'utf8',
        );
        expect(codes).toMatch(/^4E2D;/m);
    });
});

describe('glyph-names.txt', () => {
    const names = readNames();

    test('Han has a Unihan definition and toned + toneless pinyin', () => {
        const shui = names.get('6C34'); // 水
        expect(shui).toBeDefined();
        expect(shui?.[0].toLowerCase()).toContain('water');
        expect(shui).toContain('shuǐ');
        expect(shui).toContain('shui');
    });

    test('symbols/letters have their English Unicode name', () => {
        expect(names.get('2211')?.[0]).toBe('N-Ary Summation'); // ∑
        expect(names.get('0041')?.[0]).toBe('Latin Capital Letter A');
    });

    test('emoji are excluded (they use the CLDR emoji maps)', () => {
        expect(names.has('1F600')).toBe(false); // 😀
    });
});
