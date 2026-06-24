// Guards against direction-unaware (physical) CSS in Svelte <style> blocks so the
// UI keeps mirroring correctly under RTL locales. Flags physical box-side properties
// that have logical equivalents; run via `npm run rtl`. See the RTL audit plan and
// the "logical-first CSS" convention.

import fs from 'fs';
import path from 'path';

/** Each physical property we forbid, with the logical property to use instead. */
const RULES: { pattern: RegExp; physical: string; logical: string }[] = [
    { pattern: /\bmargin-left\s*:/, physical: 'margin-left', logical: 'margin-inline-start' },
    { pattern: /\bmargin-right\s*:/, physical: 'margin-right', logical: 'margin-inline-end' },
    { pattern: /\bpadding-left\s*:/, physical: 'padding-left', logical: 'padding-inline-start' },
    { pattern: /\bpadding-right\s*:/, physical: 'padding-right', logical: 'padding-inline-end' },
    { pattern: /\bborder-left\b/, physical: 'border-left', logical: 'border-inline-start' },
    { pattern: /\bborder-right\b/, physical: 'border-right', logical: 'border-inline-end' },
    { pattern: /text-align\s*:\s*left\b/, physical: 'text-align: left', logical: 'text-align: start' },
    { pattern: /text-align\s*:\s*right\b/, physical: 'text-align: right', logical: 'text-align: end' },
    { pattern: /float\s*:\s*left\b/, physical: 'float: left', logical: 'float: inline-start' },
    { pattern: /float\s*:\s*right\b/, physical: 'float: right', logical: 'float: inline-end' },
];

/**
 * Files exempt from the rule, each with a reason. These are genuine physical
 * cases (CSS-triangle geometry, the output coordinate space, or layout that is
 * already direction-aware by other means), or caret geometry deferred to the
 * JS-coordinate phase of the RTL work.
 */
const ALLOWLIST: Record<string, string> = {
    'src/components/lore/Speech.svelte':
        'Already RTL-aware via a --direction variable and row-reverse flow.',
    'src/components/output/StageView.svelte':
        'Output coordinate-space rulers (Cartesian x/y), not UI reading direction.',
    'src/components/editor/RemoteCaretOverlay.svelte':
        'CSS-triangle flag tail (symmetric transparent borders); side flip is class-driven.',
    'src/components/editor/caret/CaretView.svelte':
        'Caret geometry; direction-aware offsets handled in the JS-coordinate phase.',
};

/** Recursively collect every .svelte file under a directory. */
function svelteFiles(dir: string): string[] {
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
function styleSource(source: string): string | null {
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
        for (let i = 0; i < lines.length; i++)
            if (lineStart[i] >= start && lineStart[i] < end) inStyle[i] = true;
    }
    const kept = lines.map((line, i) => (inStyle[i] ? line : ''));
    // Blank out /* ... */ comments while preserving newlines.
    return kept.join('\n').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

const root = path.join(process.cwd(), 'src');
const violations: string[] = [];

for (const file of svelteFiles(root)) {
    const rel = path.relative(process.cwd(), file);
    if (rel in ALLOWLIST) continue;
    const styles = styleSource(fs.readFileSync(file, 'utf8'));
    if (styles === null) continue;
    styles.split('\n').forEach((line, i) => {
        for (const rule of RULES) {
            if (rule.pattern.test(line))
                violations.push(
                    `${rel}:${i + 1}  ${rule.physical} → use ${rule.logical}`,
                );
        }
    });
}

if (violations.length > 0) {
    console.error(
        `Found ${violations.length} physical CSS propert${violations.length === 1 ? 'y' : 'ies'} that should be logical (RTL-safe):\n`,
    );
    for (const v of violations) console.error(`  ${v}`);
    console.error(
        '\nUse logical properties so the UI mirrors under RTL locales. If a case is genuinely physical, add it to ALLOWLIST in scripts/check-logical-css.ts with a reason.',
    );
    process.exit(1);
} else {
    console.log('No physical (direction-unaware) CSS found. ✓');
}
