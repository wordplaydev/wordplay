import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * A program is evaluated in its reader's chosen locales, never with the en-US fallback that backs
 * up interface text: `Locales.getLocales()` appends it, which made `🌎/en` true for every reader
 * of a play view while the editor said otherwise. Every evaluator is built from
 * `getPreferredLocales()` instead, and this refuses the other.
 */

const src = path.join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (
            /\.(ts|svelte)$/.test(entry.name) &&
            !entry.name.endsWith('.test.ts')
        )
            out.push(p);
    }
    return out;
}

/** The argument text of each call to an evaluator constructor in the source. */
function evaluatorCalls(text: string): string[] {
    const calls: string[] = [];
    for (const match of text.matchAll(
        /new Evaluator\(|makePreviewEvaluator\(/g,
    )) {
        let depth = 1;
        let end = match.index + match[0].length;
        for (; end < text.length && depth > 0; end++)
            if (text[end] === '(') depth++;
            else if (text[end] === ')') depth--;
        calls.push(text.slice(match.index, end));
    }
    return calls;
}

test('no evaluator is given the interface fallback locale', () => {
    const offenders = walk(src).flatMap((file) =>
        evaluatorCalls(fs.readFileSync(file, 'utf8'))
            .filter((call) => /\.getLocales\(\)/.test(call))
            .map(
                (call) =>
                    `${path.relative(src, file)}: ${call.replace(/\s+/g, ' ')}`,
            ),
    );
    expect(offenders).toEqual([]);
});

test('the scan sees a call spanning lines', () => {
    expect(
        evaluatorCalls(
            'x = new Evaluator(\n  p,\n  DB,\n  $locales.getLocales(),\n);',
        ),
    ).toEqual(['new Evaluator(\n  p,\n  DB,\n  $locales.getLocales(),\n)']);
});
