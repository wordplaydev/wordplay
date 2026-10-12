import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { collectingLog } from '#util/verify-locales/Log.ts';
import { expect, test } from 'vitest';
import checkScriptLeak from './checkScriptLeak';

function romanUrdu(): LocaleText {
    const locale = structuredClone(DefaultLocale);
    locale.language = 'ur';
    locale.regions = ['PK'];
    locale.script = 'Latn';
    return locale;
}

test('a Roman Urdu string in Arabic script is reported and queued', () => {
    const { log, lines } = collectingLog();
    const target = romanUrdu();
    target.ui.page.login.prompt.name = '$~اپنا نام لکھیں';
    const fixed = checkScriptLeak(log, DefaultLocale, target, true);
    expect(lines.join(' ')).toContain('ui.page.login.prompt.name');
    expect(fixed.ui.page.login.prompt.name).toBe('$!اپنا نام لکھیں');
});

test('Roman Urdu in Latin script passes, as does a queued string', () => {
    const { log, lines } = collectingLog();
    const target = romanUrdu();
    target.ui.page.login.prompt.name = '$~Apna naam likhein';
    target.ui.page.login.prompt.join = '$?اپنا';
    checkScriptLeak(log, DefaultLocale, target, true);
    expect(lines.join(' ')).not.toContain('ui.page.login.prompt');
});

test('a locale in its language’s own script is not checked', () => {
    const { log, lines } = collectingLog();
    const target = romanUrdu();
    delete target.script;
    target.ui.page.login.prompt.name = '$~اپنا نام لکھیں';
    checkScriptLeak(log, DefaultLocale, target, true);
    expect(lines).toEqual([]);
});
