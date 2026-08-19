import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { stringToLocale } from '@locale/Locale';
import Source from '@nodes/Source';
import fs from 'fs';
import { expect, test } from 'vitest';
import Project from './Project';
import translateProjectContent from './translateProjectContent';

const target = JSON.parse(
    fs.readFileSync('static/locales/de-DE/de-DE.json', 'utf8'),
) as LocaleText;

/** Stand in for the model: prefix whatever it is given. */
const prefix = async (texts: string[]) => texts.map((t) => `DE ${t}`);

async function localize(code: string) {
    const project = Project.make(
        null,
        'example',
        new Source('start', code),
        [],
        DefaultLocale,
    );
    const out = await translateProjectContent(
        project,
        stringToLocale('en-US')!,
        stringToLocale('de-DE')!,
        prefix,
        target,
        true,
    );
    return out?.getMain().toWordplay() ?? '';
}

const backslashes = (t: string) => (t.match(/\\/g) ?? []).length;

test('a text literal with an interpolation keeps it', async () => {
    // The regression: only `Token` segments were read to get the text, so the
    // interpolation was dropped — and the translation written back *replaced*
    // it. `'hello \name\'` became `'hello '`, which unbalances the example's
    // delimiters, and the caller then discards the whole example.
    const code = "name: 'x'\nphrase: 'hello \\name\\'";
    const out = await localize(code);
    expect(backslashes(out)).toBe(backslashes(code));
    expect(out).toContain('\\');
});

test('a text literal that is a concept link is not emptied', async () => {
    // `'@U/192'` came back as `''` — the link is a node, not a token, so the
    // text read as empty and the empty translation replaced it.
    expect(await localize("'@U/192'")).toContain('@U/192');
});

test('plain text is still translated', async () => {
    expect(await localize("'plain text'")).toContain('DE plain text');
});

test('an interpolated reference is still retargeted', async () => {
    // Skipping the *text* must not skip the reference inside it.
    const out = await localize("name: 'x'\nphrase: 'hello \\name\\'");
    expect(out).toContain('deName');
});
