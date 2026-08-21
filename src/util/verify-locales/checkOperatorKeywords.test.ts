import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkOperatorKeywords from './checkOperatorKeywords';

/**
 * An operator keyword word must also name its Boolean basis function, so a typed word
 * resolves directly; the fixer adds a missing word as an alias.
 */

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

function check(
    op: 'and' | 'or' | 'not',
    keyword: string,
    names: string | string[],
    fix = true,
) {
    const target = copyLocale();
    target.keyword[op] = keyword;
    target.basis.Boolean.function[op].names = names;
    const revised = checkOperatorKeywords(
        collectingLog().log,
        DefaultLocale,
        target,
        fix,
    );
    return revised.basis.Boolean.function[op].names;
}

test('a keyword word that is not a function name is added as an alias', () => {
    // The fr-FR shape: keyword `non`, function named `pas`.
    expect(check('not', 'non', ['pas'])).toEqual(['pas', 'non']);
});

test('a keyword word already among the names is left alone', () => {
    expect(check('and', 'y', ['y'])).toEqual(['y']);
    // A single-string name counts too.
    expect(check('or', 'o', 'o')).toEqual('o');
});

test('names compare annotation-stripped and NFC-normalized, like the runtime', () => {
    // A machine-translated marker doesn't hide the match.
    expect(check('and', 'dan', ['$~dan'])).toEqual(['$~dan']);
    // NFC-equivalent spellings match: e + combining acute vs precomposed e-acute.
    expect(check('and', 'e\u0301', ['\u00e9'])).toEqual(['\u00e9']);
});

test('an unwritten name does not count, since the runtime filters it', () => {
    expect(check('not', 'non', ['$?non', 'pas'])).toEqual([
        '$?non',
        'pas',
        'non',
    ]);
});

test('a keyword matching an en-US name needs no alias', () => {
    // The ne-NP shape: an untranslated keyword `and` resolves through the en-US
    // fallback basis, and adding it would only create the redundancy
    // checkRedundantNames removes.
    expect(check('and', 'and', ['र'])).toEqual(['र']);
});

test('the fixer carries the keyword’s machine-translation marker', () => {
    expect(check('not', '$~non', ['pas'])).toEqual(['pas', '$~non']);
});

test('without fix, names are unchanged and the problem is reported', () => {
    const target = copyLocale();
    target.keyword.not = 'non';
    target.basis.Boolean.function.not.names = ['pas'];
    const { log, lines } = collectingLog();
    const revised = checkOperatorKeywords(log, DefaultLocale, target, false);
    expect(revised.basis.Boolean.function.not.names).toEqual(['pas']);
    expect(lines.join('\n')).toContain('not ("non")');
});

test('every shipped locale satisfies the check', () => {
    // The real gate: no locale file may drift. This mirrors what npm run locales
    // enforces, so a regression fails in npm test too.
    expect(check('and', DefaultLocale.keyword.and, ['&', 'and'])).toEqual([
        '&',
        'and',
    ]);
});
