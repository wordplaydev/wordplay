// Guards against chrome spacing written as a raw length instead of a token, so
// the spacing scale in src/app.html stays the only scale. Run via `npm run tokens`.
//
// Scoped to the spacing family — gap, padding, margin, inset — and nothing else.
// Width, height, font-size and border-radius are *measures* and *type*, where a
// round `em` is legitimate (Writing.svelte's 40em column, the palette's 15em
// cap), and widening the rule to them triples the count and drops the signal
// below the point where anyone reads the output. That is the same argument
// check-logical-css.ts makes for applying its block rules only to text surfaces.
//
// Only values ON the token grid are flagged: a px divisible by four, or an
// em/rem that is a multiple of 0.25. An off-grid value was chosen relative to
// something other than the scale and is not a token candidate — which is why
// TokenView's `0.2em`/`0.05em`, sized against the creator's editor font, never
// appear here and need no annotation. Rule and intent agree on their own.

import fs from 'fs';
import path from 'path';
import {
    exemptedLines,
    markerLines,
    markerPattern,
    styleSource,
    svelteFiles,
} from './css/styleScan.ts';

/** The properties whose values are chrome spacing. */
const SPACING_PROPERTY =
    /\b(gap|row-gap|column-gap|(?:padding|margin)(?:-(?:block|inline)(?:-(?:start|end))?|-(?:top|bottom|left|right))?|inset(?:-(?:block|inline)(?:-(?:start|end))?)?)\s*:\s*([^;{}]+)/g;

/** A length with a unit, or a bare zero. */
const LENGTH = /(-?\d*\.?\d+)(px|rem|em)\b/g;

/**
 * An escape hatch for a distance that really is relative to something other than
 * the scale, written as a CSS comment on the line above:
 *
 *     /* scale: tracks the card's clamp() font-size, so the gaps shrink
 *        with the type in a small preview. *\/
 *     gap: 1em;
 *
 * Named `scale:` rather than `raw:` because it says what the exception is —
 * this distance belongs to a different scale — rather than only that it is
 * allowed. The reason is mandatory; see markerPattern.
 */
const SCALE_MARKER = markerPattern('scale');

/** Whether a length sits on the spacing grid, and so could have been a token. */
function onGrid(value: number, unit: string): boolean {
    if (value === 0) return false;
    const magnitude = Math.abs(value);
    if (unit === 'px') return magnitude % 4 === 0;
    // 0.25rem is the smallest step; em is included because at the app root
    // 1em === 1rem, which is what makes these convertible at all.
    return Math.abs(magnitude / 0.25 - Math.round(magnitude / 0.25)) < 1e-9;
}

/** One chrome distance written as a raw length rather than a token. */
export type RawLength = {
    /** Repository-relative path. */
    file: string;
    /** 1-indexed line within the file. */
    line: number;
    property: string;
    value: string;
};

/** Render a finding the way the command line reports it. */
export function describeRawLength(problem: RawLength): string {
    return `${problem.file}:${problem.line}  ${problem.property}: ${problem.value}`;
}

/** A `scale:` marker that no longer introduces a raw length — so it explains
 *  nothing, and would silence whatever is written under it next. */
export type StaleMarker = { file: string; line: number };

export type TokenFindings = {
    /** On-grid raw lengths with no marker: the worklist. */
    untokenized: RawLength[];
    /** On-grid raw lengths a `scale:` marker covers: the argued exceptions. */
    marked: RawLength[];
    /** Markers covering no raw length at all. */
    stale: StaleMarker[];
};

/** Every finding in one file's `<style>` blocks. Separated from the directory
 *  walk so the grid rule and the escape hatch can be exercised against fixtures. */
export function checkStyleSource(rel: string, source: string): TokenFindings {
    const styles = styleSource(source);
    if (styles === null) return { untokenized: [], marked: [], stale: [] };
    const raw = source.split('\n');
    const exempted = exemptedLines(raw, SCALE_MARKER);
    const untokenized: RawLength[] = [];
    const marked: RawLength[] = [];
    /** Which marker runs actually covered something. */
    const used = new Set<number>();

    styles.split('\n').forEach((line, i) => {
        for (const declaration of line.matchAll(SPACING_PROPERTY)) {
            const property = declaration[1] ?? '';
            const value = (declaration[2] ?? '').trim();
            // A value already reaching for the scale is not a finding, whatever
            // else is in it — `calc(var(--wordplay-spacing) + 1px)` is someone
            // adjusting a token, not ignoring it.
            if (value.includes('var(--wordplay-')) continue;
            for (const length of value.matchAll(LENGTH)) {
                const magnitude = Number(length[1]);
                const unit = length[2] ?? '';
                if (!onGrid(magnitude, unit)) continue;
                const finding = {
                    file: rel,
                    line: i + 1,
                    property,
                    value,
                };
                if (exempted.has(i)) {
                    marked.push(finding);
                    used.add(i);
                } else untokenized.push(finding);
                break;
            }
        }
    });

    // A marker is stale when nothing in the run it covers was a finding.
    const stale = markerLines(raw, SCALE_MARKER)
        .filter((start) => {
            for (const line of used)
                if (line >= start && exempted.has(line)) return false;
            return true;
        })
        .map((line) => ({ file: rel, line: line + 1 }));

    return { untokenized, marked, stale };
}

/** Every finding under `root`. The whole check, as data — so the convention test
 *  can call it directly rather than shelling out to this file. */
export function findRawLengths(root = 'src'): TokenFindings {
    const base = path.isAbsolute(root) ? root : path.join(process.cwd(), root);
    const all: TokenFindings = { untokenized: [], marked: [], stale: [] };
    for (const file of svelteFiles(base)) {
        const found = checkStyleSource(
            path.relative(process.cwd(), file),
            fs.readFileSync(file, 'utf8'),
        );
        all.untokenized.push(...found.untokenized);
        all.marked.push(...found.marked);
        all.stale.push(...found.stale);
    }
    return all;
}

// Report only when run as a command; importing this module must have no side
// effects (scripts/check-logical-css.ts uses the same guard).
if (import.meta.url === `file://${process.argv[1]}`) {
    const { untokenized, marked, stale } = findRawLengths();
    console.log(
        `${untokenized.length} untokenized, ${marked.length} marked \`scale:\`, ${stale.length} stale markers.\n`,
    );
    for (const v of untokenized) console.log(`  ${describeRawLength(v)}`);
    if (stale.length > 0) {
        console.log('\nMarkers explaining nothing:');
        for (const s of stale) console.log(`  ${s.file}:${s.line}`);
    }
    console.log(
        '\nUse a step from the spacing scale in src/app.html. If a distance really is relative to something else, put a `/* scale: <reason> */` comment above it.',
    );
}
