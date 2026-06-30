import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Log from '@util/verify-locales/Log';
import checkGlobalNames from '@util/verify-locales/checkGlobalNames';

function runCheck(locale: LocaleText): string[] {
    const log = new Log(false);
    const bads: string[] = [];
    // Capture bad() calls instead of printing/exiting.
    log.bad = (_level: number, message: string) => {
        bads.push(message);
    };
    checkGlobalNames(log, locale);
    return bads;
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
