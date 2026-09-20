import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import {
    SpacingVariables,
    UndocumentedSpacing,
} from '../routes/[[locale]]/design/tokens';

/**
 * The `/design` page's spacing table is a copy of what `src/app.html` declares,
 * and this is what stops it drifting.
 *
 * It had already drifted when this test was written: the table said
 * `--wordplay-spacing` was `0.5em` and `--wordplay-spacing-half` `0.25em`, while
 * app.html has always declared them in `rem`. The page computes the resolved
 * pixel value live, so the *number* beside them was right and only the CSS value
 * a contributor would copy was wrong — which is the kind of error a reference
 * page is worst at revealing about itself.
 *
 * Same method as `emailPaletteSync.test.ts`: read app.html, compare the mirror.
 */

const appHtml = readFileSync(resolve(__dirname, '../app.html'), 'utf-8');

/**
 * Read a `--name: value;` declaration.
 *
 * Anchored to the start of a line, unlike `emailPaletteSync`'s reader, so this
 * can only ever match a declaration and never a `var(--name)` usage elsewhere in
 * the file — app.html both declares these tokens and uses them a few lines
 * later.
 */
function declaredValue(name: string): string | undefined {
    const match = appHtml.match(
        new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`),
    );
    return match === null ? undefined : (match[1] ?? '').trim();
}

test('every documented token matches what app.html declares', () => {
    const wrong = SpacingVariables.flatMap((v) => {
        const actual = declaredValue(v.name);
        return actual === v.cssValue
            ? []
            : [
                  `${v.name}: the table says ${v.cssValue}, app.html says ${actual ?? '(not declared)'}`,
              ];
    });
    expect(wrong).toEqual([]);
});

/**
 * Every length-valued `--wordplay-*` token app.html declares is either on the
 * page or deliberately left off it with a reason.
 *
 * Without this the table stays at whatever size it was when someone last
 * remembered it — it documented six of nineteen — and a contributor reading it
 * concludes the other thirteen do not exist.
 */
test('every length token is documented or deliberately not', () => {
    // A length literal: a number with a CSS unit, or a bare number (a weight or
    // a ratio), which is what separates these from colors, fonts and keywords.
    const declarations = [
        ...appHtml.matchAll(
            /(?:^|\n)\s*(--wordplay-[a-z-]+):\s*(-?\d*\.?\d+(?:px|rem|em|ex|ch|%)?)\s*;/g,
        ),
    ];
    const declared = new Set(declarations.map((m) => m[1] ?? ''));
    const documented = new Set(SpacingVariables.map((v) => v.name));
    const missing = [...declared].filter(
        (name) => !documented.has(name) && !(name in UndocumentedSpacing),
    );
    expect(missing).toEqual([]);
});

/** A reason for leaving a token off the page is only worth keeping while the
 *  token is still there to leave off. */
test('every undocumented-token reason names a token app.html still declares', () => {
    const stale = Object.keys(UndocumentedSpacing).filter(
        (name) => declaredValue(name) === undefined,
    );
    expect(stale).toEqual([]);
});

/** The page draws a square of each token it can compute, so a value it claims
 *  is computable has to be a length rather than a weight or a ratio. */
test('every computable token is a length', () => {
    const notLengths = SpacingVariables.filter(
        (v) =>
            v.canCompute &&
            !/^-?\d*\.?\d+(px|rem|em|ex|ch|%)$/.test(v.cssValue),
    ).map((v) => `${v.name}: ${v.cssValue}`);
    expect(notLengths).toEqual([]);
});
