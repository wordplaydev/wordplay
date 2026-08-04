import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import checkGlobalNames from '@util/verify-locales/checkGlobalNames';

/** The check only ever reports errors, so every gathered line is one. */
function runCheck(locale: LocaleText): string[] {
    const { log, lines } = collectingLog();
    checkGlobalNames(log, locale);
    return lines;
}

test('en-US has no global-name collisions', () => {
    expect(runCheck(DefaultLocale)).toEqual([]);
});

test('two distinct sequences collapsed into one name fail', () => {
    const broken = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    // Give rotateout the same names as rotatein — distinct concepts, same name.
    broken.output.sequence.rotateout.names =
        broken.output.sequence.rotatein.names;
    const bads = runCheck(broken);
    expect(bads.some((m) => m.includes('different concepts'))).toBe(true);
});
