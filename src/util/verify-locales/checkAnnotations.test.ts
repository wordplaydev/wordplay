import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { isRevised } from '@locale/LocaleText';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkAnnotations from './checkAnnotations';

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

test('a single annotation is left alone', () => {
    const target = copyLocale();
    target.ui.dialog.feedback.error.login = `${MachineTranslated}hola`;
    const { log } = collectingLog();
    const fixed = checkAnnotations(log, target, true);
    expect(log.errorCount).toBe(0);
    expect(fixed.ui.dialog.feedback.error.login).toBe(
        `${MachineTranslated}hola`,
    );
});

test('stacked annotations are reported and collapsed by priority', () => {
    const target = copyLocale();
    // The real-world case: machine translated, then the en-US source was
    // revised, leaving "$~$!" — which reads as merely "$~".
    target.ui.dialog.feedback.error.login = `${MachineTranslated}${Revised}hola`;
    const { log } = collectingLog();
    const fixed = checkAnnotations(log, target, true);
    expect(log.errorCount).toBe(1);
    expect(fixed.ui.dialog.feedback.error.login).toBe(`${Revised}hola`);
});

test('unwritten outranks both other statuses', () => {
    const target = copyLocale();
    target.ui.dialog.feedback.error.login = `${MachineTranslated}${Unwritten}hola`;
    const fixed = checkAnnotations(collectingLog().log, target, true);
    expect(fixed.ui.dialog.feedback.error.login).toBe(`${Unwritten}hola`);
});

test('a collapsed string becomes visible to the translator again', () => {
    // This is the whole point: "$~$!x" fails isRevised, so the translator skips
    // it outside override mode and the revision request is silently dropped.
    const stacked = `${MachineTranslated}${Revised}hola`;
    expect(isRevised(stacked)).toBe(false);
    const target = copyLocale();
    target.ui.dialog.feedback.error.login = stacked;
    const fixed = checkAnnotations(collectingLog().log, target, true);
    expect(isRevised(fixed.ui.dialog.feedback.error.login)).toBe(true);
});

test('without fix it reports but does not modify', () => {
    const target = copyLocale();
    target.ui.dialog.feedback.error.login = `${MachineTranslated}${Revised}hola`;
    const { log } = collectingLog();
    checkAnnotations(log, target, false);
    expect(log.errorCount).toBe(1);
    expect(target.ui.dialog.feedback.error.login).toBe(
        `${MachineTranslated}${Revised}hola`,
    );
});

test('the shipped locales carry no stacked annotations', () => {
    const { log } = collectingLog();
    checkAnnotations(log, copyLocale(), false);
    expect(log.errorCount).toBe(0);
});
