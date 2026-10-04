import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { collectingLog } from '#util/verify-locales/Log.ts';
import { expect, test } from 'vitest';
import checkCollapsedSpaces from './checkCollapsedSpaces';

function copyLocale(): LocaleText {
    return structuredClone(DefaultLocale);
}

/** Removes every space from every string in place, the way a script with no
 *  word spaces reads to this check. */
function stripSpaces(value: object): void {
    for (const key of Object.keys(value)) {
        const child: unknown = Reflect.get(value, key);
        if (typeof child === 'string')
            Reflect.set(value, key, child.replace(/\s/g, ''));
        else if (child !== null && typeof child === 'object')
            stripSpaces(child);
    }
}

const Prompt = DefaultLocale.ui.page.login.prompt.name;

test('prose that lost its spaces is reported and queued', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.page.login.prompt.name = `$~${Prompt.replace(/\s/g, '')}`;
    const fixed = checkCollapsedSpaces(log, DefaultLocale, target, true);
    expect(lines.join(' ')).toContain('ui.page.login.prompt.name');
    expect(fixed.ui.page.login.prompt.name).toBe(
        `$!${Prompt.replace(/\s/g, '')}`,
    );
});

test('an example whose code lost its spaces is reported', () => {
    // The shape a translation pass returned in three locales, which the
    // example's 🪲 marker exempted from conflict checking.
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.node.FunctionType.doc = [
        DefaultLocale.node.FunctionType.doc[0] ?? '',
        '\\math•ƒ( #\n###)#:ƒinteresting(a•#b•#c•#d•#)a+b+c+d\\🪲',
    ];
    checkCollapsedSpaces(log, DefaultLocale, target, false);
    expect(lines.join(' ')).toContain('node.FunctionType.doc');
});

test('a locale identical to en-US reports nothing', () => {
    const { log, lines } = collectingLog();
    checkCollapsedSpaces(log, DefaultLocale, copyLocale(), false);
    expect(lines).toEqual([]);
});

test('prose in a locale that uses no spaces is not measured', () => {
    const { log } = collectingLog();
    const target = copyLocale();
    stripSpaces(target);
    const fixed = checkCollapsedSpaces(log, DefaultLocale, target, true);
    expect(fixed.ui.page.login.prompt.name).toBe(Prompt.replace(/\s/g, ''));
});

test('a queued string and the guidance are left alone', () => {
    const { log, lines } = collectingLog();
    const target = copyLocale();
    target.ui.page.login.prompt.name = `$?${Prompt.replace(/\s/g, '')}`;
    target.guidance = 'x'.repeat(200);
    checkCollapsedSpaces(log, DefaultLocale, target, false);
    expect(lines).toEqual([]);
});
