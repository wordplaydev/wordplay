import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';
import Log from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkNames from './checkNames';

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

const OutOfBoundsPath = new LocalePath(['basis', 'List'], 'outofbounds', []);
const BooleanNamePath = new LocalePath(['basis', 'Boolean'], 'name', []);
const ZippyPath = new LocalePath(['output', 'Easing'], 'zippy', []);

test('invalid identifiers are folded into valid names on fix', () => {
    const target = copyLocale();
    OutOfBoundsPath.repair(target, '$~out of bounds');
    ZippyPath.repair(target, '$~pełen werwy');
    const fixed = checkNames(new Log(false), DefaultLocale, target, true);
    expect(OutOfBoundsPath.resolve(fixed)).toBe('$~outOfBounds');
    expect(ZippyPath.resolve(fixed)).toBe('$~pełenWerwy');
});

test('hyphenated names are folded into one token', () => {
    const target = copyLocale();
    ZippyPath.repair(target, '$~mili-shniya');
    const fixed = checkNames(new Log(false), DefaultLocale, target, true);
    expect(ZippyPath.resolve(fixed)).toBe('$~miliShniya');
});

test('unfoldable values fall back to the en-US element at the same index', () => {
    const target = copyLocale();
    // The real te-IN corruption shape: symbol concatenated with a word.
    BooleanNamePath.repair(target, ['$~⊤⊥తెలుగు', '$~బూలియన్']);
    const fixed = checkNames(new Log(false), DefaultLocale, target, true);
    expect(BooleanNamePath.resolve(fixed)).toEqual(['$~⊤⊥', '$~బూలియన్']);
});

test('values copied verbatim from en-US are trusted', () => {
    const target = copyLocale();
    // The symbolic names are multi-token by design.
    BooleanNamePath.repair(target, ['$~⊤⊥', '$~vero']);
    const fixed = checkNames(new Log(false), DefaultLocale, target, true);
    expect(BooleanNamePath.resolve(fixed)).toEqual(['$~⊤⊥', '$~vero']);
});

test('display labels are not name-checked', () => {
    const target = copyLocale();
    target.node.Docs.name = '$~lista de explicaciones';
    const fixed = checkNames(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Docs.name).toBe('$~lista de explicaciones');
});

test('verify mode reports but never mutates', () => {
    const target = copyLocale();
    ZippyPath.repair(target, '$~pełen werwy');
    const result = checkNames(new Log(false), DefaultLocale, target, false);
    expect(result).toBe(target);
    expect(ZippyPath.resolve(target)).toBe('$~pełen werwy');
});
