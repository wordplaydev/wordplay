import type LocaleText from '@locale/LocaleText';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import LocalePath from '@util/verify-locales/LocalePath';
import { collectingLog } from '@util/verify-locales/Log';
import fs from 'fs';
import { expect, test } from 'vitest';
import checkPointedNames from './checkPointedNames';

/**
 * Hebrew is written without vowel points and nobody types them into code, so a pointed name is
 * an identifier no creator can enter.
 */

const Hebrew: LocaleText = JSON.parse(
    fs.readFileSync(getLocalePath('he-IL'), 'utf8'),
);

const PhraseBubble = new LocalePath(
    ['output', 'Phrase', 'bubble'],
    'names',
    [],
);
const PhrasePlace = new LocalePath(['output', 'Phrase', 'place'], 'names', []);

function withNames(changes: [LocalePath, string | string[]][]): LocaleText {
    const copy: LocaleText = JSON.parse(JSON.stringify(Hebrew));
    for (const [path, names] of changes) path.repair(copy, names);
    return copy;
}

function check(text: LocaleText, fix = true) {
    const { log, lines } = collectingLog();
    return { lines, revised: checkPointedNames(log, text, fix) };
}

test('vowel points come off, and the write status stays on', () => {
    const { revised } = check(withNames([[PhraseBubble, '$~בּוּעָה']]));
    expect(PhraseBubble.resolve(revised)).toBe('$~בועה');
});

test('every pointed name is stripped, not every other one', () => {
    // A global regex remembers `lastIndex` between calls, which would skip alternate names.
    const { revised } = check(
        withNames([[PhraseBubble, ['$~בּוּעָה', '$~הִלָּה', '$~עֲנָן']]]),
    );
    expect(PhraseBubble.resolve(revised)).toEqual(['$~בועה', '$~הלה', '$~ענן']);
});

test('an unpointed name is left exactly as it is', () => {
    const text = withNames([[PhraseBubble, '$~בועה']]);
    const { revised, lines } = check(text);
    expect(PhraseBubble.resolve(revised)).toBe('$~בועה');
    expect(lines.filter((line) => line.includes('vowel points'))).toEqual([]);
});

test('a strip that would collide with a sibling is refused', () => {
    // Two inputs of one structure must not end up sharing a name; nothing else checks that.
    const { revised, lines } = check(
        withNames([
            [PhraseBubble, '$~בּוּעָה'],
            [PhrasePlace, '$~בועה'],
        ]),
    );
    expect(PhraseBubble.resolve(revised)).toBe('$~בּוּעָה');
    expect(lines.some((line) => line.includes('collides'))).toBe(true);
});

test('verify writes nothing', () => {
    const text = withNames([[PhraseBubble, '$~בּוּעָה']]);
    const { revised, lines } = check(text, false);
    expect(PhraseBubble.resolve(revised)).toBe('$~בּוּעָה');
    expect(lines.some((line) => line.includes('vowel points'))).toBe(true);
});

test('the locale as it ships carries no pointed names', () => {
    const { lines } = check(Hebrew, false);
    expect(lines.filter((line) => line.includes('vowel points'))).toEqual([]);
});

test('the locale as it ships has no refused strips', () => {
    // A refusal is permanent — `fix` returns the name unchanged — so a pointed name that collides
    // stays untypable forever. Filtering only for 'vowel points' above hid five of them.
    const { lines } = check(Hebrew, false);
    expect(lines.filter((line) => line.includes('collides'))).toEqual([]);
});

test('a type variable may share a word with another definition’s', () => {
    // `basis.List.kind` and `basis.Set.kind` are type variables of different definitions, named
    // alike in en-US (`Kind`, `Kind`) and in every locale. They are not siblings.
    const ListKind = new LocalePath(['basis', 'List'], 'kind', []);
    const SetKind = new LocalePath(['basis', 'Set'], 'kind', []);
    const { revised, lines } = check(
        withNames([
            [ListKind, '$~סוּג'],
            [SetKind, '$~סוּג'],
        ]),
    );
    expect(ListKind.resolve(revised)).toBe('$~סוג');
    expect(SetKind.resolve(revised)).toBe('$~סוג');
    expect(lines.filter((line) => line.includes('collides'))).toEqual([]);
});

test('two members of one definition still collide', () => {
    // The narrower scope must still catch a real clash: `key` and `value` are both Map's.
    const MapKey = new LocalePath(['basis', 'Map'], 'key', []);
    const MapValue = new LocalePath(['basis', 'Map'], 'value', []);
    const { revised, lines } = check(
        withNames([
            [MapKey, '$~מַפְתֵּחַ'],
            [MapValue, '$~מפתח'],
        ]),
    );
    expect(MapKey.resolve(revised)).toBe('$~מַפְתֵּחַ');
    expect(lines.some((line) => line.includes('collides'))).toBe(true);
});

test('a locale with no Hebrew is untouched', () => {
    const greek: LocaleText = JSON.parse(
        fs.readFileSync(getLocalePath('el-GR'), 'utf8'),
    );
    const { revised } = check(greek);
    expect(JSON.stringify(revised)).toBe(JSON.stringify(greek));
});
