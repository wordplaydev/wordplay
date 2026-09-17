import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';
import type LocaleText from '@locale/LocaleText';
import { getNameLocales } from '@locale/getNameLocales';
import { expect, test } from 'vitest';

/**
 * An unwritten (`$?`) name carries the English it is waiting to replace, so the
 * filter has to run before annotations are stripped. Stripping first leaves the
 * English behind as an ordinary name, which binds en-US's word in a locale that
 * never chose it — the cross-locale collision `checkRedundantNames` exists to
 * prevent. `getConceptName`'s `writtenName` makes the same decision, and its
 * comment already promises that `Names` filters these at runtime.
 */

/** A locale of its own, so the chain is only this one and en-US's real names
 *  can't be mistaken for the placeholder's. `zh-SG` is unshipped, which keeps it
 *  out of `Basis.Bases`, keyed by locale name. */
function localeWith(names: string[]): Locales {
    const locale: LocaleText = structuredClone(DefaultLocale);
    locale.language = 'zh';
    locale.regions = ['SG'];
    locale.input.Volume.names = names;
    return new Locales(concretize, [locale], locale);
}

test('an unwritten name is not bound as a name of its own', () => {
    const names = getNameLocales(
        localeWith(['$?Volume']),
        (l) => l.input.Volume.names,
    );
    expect(names.getNames()).not.toContain('Volume');
});

test('a written name beside an unwritten one is the one that binds', () => {
    const names = getNameLocales(
        localeWith(['$?Volume', '音量']),
        (l) => l.input.Volume.names,
    );
    expect(names.getNames()).toContain('音量');
    expect(names.getNames()).not.toContain('Volume');
});

test('a written name is bound normally', () => {
    const names = getNameLocales(
        localeWith(['音量']),
        (l) => l.input.Volume.names,
    );
    expect(names.getNames()).toContain('音量');
});
