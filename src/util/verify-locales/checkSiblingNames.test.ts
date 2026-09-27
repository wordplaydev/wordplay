import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkSiblingNames, {
    findSiblingNameCollisions,
} from './checkSiblingNames';

/**
 * A locale that gives two members of one definition the same word binds it to only one of them,
 * and no per-string check can see that.
 */

const CircleY = new LocalePath(['output', 'Circle', 'y'], 'names', []);
const CircleZ = new LocalePath(['output', 'Circle', 'z'], 'names', []);
const PolygonZ = new LocalePath(['output', 'Polygon', 'z'], 'names', []);

function withNames(changes: [LocalePath, string | string[]][]): LocaleText {
    const copy: LocaleText = structuredClone(DefaultLocale);
    for (const [path, names] of changes) path.repair(copy, names);
    return copy;
}

function check(text: LocaleText, exemptions: Record<string, string[]> = {}) {
    const { log, lines } = collectingLog();
    checkSiblingNames(log, 'xx-XX', text, exemptions);
    return { lines, errors: log.errorCount };
}

test('en-US gives no two siblings the same name', () => {
    expect(findSiblingNameCollisions(DefaultLocale)).toEqual([]);
});

test('two members of one definition sharing a word is an error', () => {
    // zh-CN's shape once named both `y` and `z` 是.
    const text = withNames([
        [CircleY, '$~是'],
        [CircleZ, '$~是'],
    ]);
    expect(findSiblingNameCollisions(text)).toEqual([
        {
            scope: 'output.Circle',
            name: '是',
            paths: ['output.Circle.y.names', 'output.Circle.z.names'],
        },
    ]);
    expect(check(text).errors).toBe(1);
});

test('the same word in two different definitions is fine', () => {
    expect(
        findSiblingNameCollisions(
            withNames([
                [CircleZ, 'depth'],
                [PolygonZ, 'depth'],
            ]),
        ),
    ).toEqual([]);
});

test('a name inside a list of names collides too', () => {
    const text = withNames([
        [CircleY, ['vertical', 'shared']],
        [CircleZ, 'shared'],
    ]);
    expect(findSiblingNameCollisions(text).map((c) => c.name)).toEqual([
        'shared',
    ]);
});

test('names differing only by case are different names', () => {
    // Wordplay names are case-sensitive, and en-US pairs `bubble` with `Bubble` on purpose.
    expect(
        findSiblingNameCollisions(
            withNames([
                [CircleY, 'Tiefe'],
                [CircleZ, 'tiefe'],
            ]),
        ),
    ).toEqual([]);
});

test('an exempted collision is quiet, and a stale exemption is an error', () => {
    const text = withNames([
        [CircleY, '是'],
        [CircleZ, '是'],
    ]);
    expect(check(text, { 'xx-XX': ['output.Circle 是'] }).errors).toBe(0);
    // Once the locale is fixed, the exemption must go, so the list only shrinks.
    expect(check(DefaultLocale, { 'xx-XX': ['output.Circle 是'] }).errors).toBe(
        1,
    );
});
