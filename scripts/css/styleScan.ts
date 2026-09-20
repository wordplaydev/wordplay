// The parts of a Svelte `<style>` scan that any CSS convention check needs:
// finding the files, isolating the style blocks with line numbers intact, and
// honoring a per-line escape-hatch comment.
//
// Lifted out of check-logical-css.ts when a second check (check-design-tokens.ts)
// needed the same three things. Deliberately no rules and no allowlist: those
// belong to the check that makes the claim, so one check's exemption can never
// silently waive another's.

import fs from 'fs';
import path from 'path';

/** Recursively collect every .svelte file under a directory. */
export function svelteFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...svelteFiles(full));
        else if (entry.name.endsWith('.svelte')) found.push(full);
    }
    return found;
}

/** Return the concatenated <style> block contents with CSS comments blanked out
 *  (preserving newlines so reported line numbers stay accurate). */
export function styleSource(source: string): string | null {
    const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
    if (blocks.length === 0) return null;
    // Rebuild a line-aligned view: keep everything, but only the style regions
    // carry content; everything else becomes blank lines.
    const lines = source.split('\n');
    const inStyle = new Array(lines.length).fill(false);
    let offset = 0;
    const lineStart: number[] = [];
    for (const line of lines) {
        lineStart.push(offset);
        offset += line.length + 1;
    }
    for (const block of blocks) {
        const start = block.index ?? 0;
        const end = start + block[0].length;
        // One offset was pushed per line, so this covers exactly `lines`.
        lineStart.forEach((offset, i) => {
            if (offset >= start && offset < end) inStyle[i] = true;
        });
    }
    const kept = lines.map((line, i) => (inStyle[i] ? line : ''));
    // Blank out /* ... */ comments while preserving newlines.
    return kept
        .join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * The regex for an escape-hatch comment introduced by `word`, e.g. `physical:`
 * or `scale:`.
 *
 * The lookahead is what makes the reason mandatory: without it a bare
 * `/* word: *\/` satisfies `\S` with the `*` that closes the comment, turning
 * the hatch into a marker anyone could paste with nothing to review.
 */
export function markerPattern(word: string): RegExp {
    return new RegExp(`\\/\\*\\s*${word}:\\s*(?!\\*\\/)\\S`);
}

/**
 * The 0-indexed lines a marker comment exempts: from the marker itself through
 * to the end of its rule or the next blank line — the run it is plainly about.
 *
 * Per line rather than per file, because a file is mostly ordinary CSS with a
 * little of the exceptional case in it, and exempting the whole file would stop
 * guarding the rest. Reads the ORIGINAL source, not `styleSource`'s output,
 * which has blanked the comments away.
 */
export function exemptedLines(raw: string[], marker: RegExp): Set<number> {
    const exempted = new Set<number>();
    for (const [i, line] of raw.entries()) {
        if (!marker.test(line)) continue;
        for (let j = i; j < raw.length; j++) {
            exempted.add(j);
            const after = raw[j + 1];
            if (after === undefined) break;
            if (after.trim() === '' || after.includes('}')) break;
        }
    }
    return exempted;
}

/** Every line a marker comment appears on, so a check can tell whether a marker
 *  still covers anything it explains rather than outliving its declaration. */
export function markerLines(raw: string[], marker: RegExp): number[] {
    return raw.flatMap((line, i) => (marker.test(line) ? [i] : []));
}
