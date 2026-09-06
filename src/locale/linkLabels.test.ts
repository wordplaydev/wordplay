import { expect, test } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import DefaultLocale from '@locale/DefaultLocale';

/**
 * A template input can't be a web link's label.
 *
 * `parseWebLink` reads the label as `Sym.Words`, but `$name` lexes as
 * `Sym.Mention` — so `<$name@://galleries>` doesn't parse as a link at all:
 * the mention is consumed as the URL, and the rest of the paragraph goes with
 * it. Nothing catches that. The two moderation strings written this way said
 * only "The curators of" and dropped the sentence they were making, in every
 * locale, and in the two whose grammar puts the name first they rendered
 * nothing whatsoever.
 *
 * It's the silence that makes it worth a test: the string looks right in the
 * JSON, the locale verifier is happy, and the failure is a sentence that
 * quietly stops. Write the input as plain text (`$name`) and put a link, if
 * one is wanted, somewhere it isn't the label.
 */
const MentionAsLinkLabel = /<\s*\$[^>]*@/;

function stringsIn(value: unknown, path: string): [string, string][] {
    if (typeof value === 'string') return [[path, value]];
    if (Array.isArray(value))
        return value.flatMap((v, i) => stringsIn(v, `${path}[${i}]`));
    if (value !== null && typeof value === 'object')
        return Object.entries(value).flatMap(([k, v]) =>
            stringsIn(v, `${path}.${k}`),
        );
    return [];
}

function offenders(locale: unknown): string[] {
    return stringsIn(locale, '')
        .filter(([, text]) => MentionAsLinkLabel.test(text))
        .map(([path]) => path);
}

test('en-US uses no template input as a web link label', () => {
    expect(offenders(DefaultLocale)).toEqual([]);
});

test('no shipped locale uses a template input as a web link label', () => {
    const root = join('static', 'locales');
    const found: string[] = [];
    for (const code of readdirSync(root)) {
        // The locale's own file; its tutorial and how-to bundles are separate.
        const file = join(root, code, `${code}.json`);
        if (!existsSync(file)) continue;
        for (const path of offenders(JSON.parse(readFileSync(file, 'utf8'))))
            found.push(`${code}${path}`);
    }
    expect(found).toEqual([]);
});
