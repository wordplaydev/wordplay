// Guards against direction-unaware (physical) CSS in Svelte <style> blocks so the
// UI keeps mirroring correctly under RTL locales, and so text surfaces stay
// correct under a vertical writing mode. Run via `npm run rtl`.
//
// Two tiers, because they cost different things. The INLINE_RULES are the
// original RTL guard and apply everywhere: a physical inline side is wrong in
// any right-to-left locale, which the app has shipped for a while. The
// BLOCK_RULES matter only once text can flow down the screen — where a
// margin-top is across the lines in one mode and along them in another — so they
// apply only to TEXT_SURFACES, the components that actually carry the writing
// mode. Applying them everywhere would flag hundreds of legitimately physical
// declarations in spatial chrome (toolbars, the tile manager, pickers), which
// stays horizontal by design, and bury the signal.

import fs from 'fs';
import path from 'path';

type Rule = { pattern: RegExp; physical: string; logical: string };

/** Physical inline-axis properties, forbidden everywhere. */
const INLINE_RULES: Rule[] = [
    {
        pattern: /\bmargin-left\s*:/,
        physical: 'margin-left',
        logical: 'margin-inline-start',
    },
    {
        pattern: /\bmargin-right\s*:/,
        physical: 'margin-right',
        logical: 'margin-inline-end',
    },
    {
        pattern: /\bpadding-left\s*:/,
        physical: 'padding-left',
        logical: 'padding-inline-start',
    },
    {
        pattern: /\bpadding-right\s*:/,
        physical: 'padding-right',
        logical: 'padding-inline-end',
    },
    {
        pattern: /\bborder-left\b/,
        physical: 'border-left',
        logical: 'border-inline-start',
    },
    {
        pattern: /\bborder-right\b/,
        physical: 'border-right',
        logical: 'border-inline-end',
    },
    {
        pattern: /text-align\s*:\s*left\b/,
        physical: 'text-align: left',
        logical: 'text-align: start',
    },
    {
        pattern: /text-align\s*:\s*right\b/,
        physical: 'text-align: right',
        logical: 'text-align: end',
    },
    {
        pattern: /float\s*:\s*left\b/,
        physical: 'float: left',
        logical: 'float: inline-start',
    },
    {
        pattern: /float\s*:\s*right\b/,
        physical: 'float: right',
        logical: 'float: inline-end',
    },
];

/** Physical block-axis and scroll-axis properties, forbidden on text surfaces
 *  only. These are the ones a vertical writing mode transposes. */
const BLOCK_RULES: Rule[] = [
    {
        pattern: /\bmargin-top\s*:/,
        physical: 'margin-top',
        logical: 'margin-block-start',
    },
    {
        pattern: /\bmargin-bottom\s*:/,
        physical: 'margin-bottom',
        logical: 'margin-block-end',
    },
    {
        pattern: /\bpadding-top\s*:/,
        physical: 'padding-top',
        logical: 'padding-block-start',
    },
    {
        pattern: /\bpadding-bottom\s*:/,
        physical: 'padding-bottom',
        logical: 'padding-block-end',
    },
    {
        pattern: /\bborder-top\b(?!-)/,
        physical: 'border-top',
        logical: 'border-block-start',
    },
    {
        pattern: /\bborder-bottom\b(?!-)/,
        physical: 'border-bottom',
        logical: 'border-block-end',
    },
    {
        pattern: /\boverflow-x\s*:/,
        physical: 'overflow-x',
        logical: 'overflow-inline (or plain overflow)',
    },
    {
        pattern: /\boverflow-y\s*:/,
        physical: 'overflow-y',
        logical: 'overflow-block (or plain overflow)',
    },
];

/**
 * The components that carry a writing mode — where text actually flows and so
 * where the block axis is not reliably vertical. Kept as an explicit list rather
 * than inferred, so adding a surface is a deliberate act with a reviewable diff.
 */
const TEXT_SURFACES: string[] = [
    'src/components/app/Writing.svelte',
    'src/components/concepts/MarkupHTMLView.svelte',
    'src/components/editor/Editor.svelte',
    'src/components/widgets/Dialog.svelte',
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
    'src/components/output/PhraseView.svelte':
        'CSS-triangle bubble tail (symmetric transparent borders), one ruleset per side.',
    'src/components/output/PathHandles.svelte':
        'Centers a handle on a point in the output coordinate space, not reading direction.',
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

/** An escape hatch for a declaration that really is physical, written as a CSS
 *  comment on the same line or the line above:
 *
 *      /* physical: pins to the viewport's top border, not the text's *\/
 *      margin-top: ...;
 *
 *  Per line rather than per file, because a text surface is mostly text with a
 *  little chrome in it, and exempting the whole file would stop guarding the
 *  prose. The reason is required, and the lookahead is what makes that true: a
 *  bare `\/* physical: *\/` would otherwise satisfy `\S` with the `*` that
 *  closes the comment, turning the hatch into a bare marker anyone could paste. */
const PHYSICAL_MARKER = /\/\*\s*physical:\s*(?!\*\/)\S/;

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
    return kept
        .join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** One physical declaration that should have been logical. */
export type PhysicalCSS = {
    /** Repository-relative path. */
    file: string;
    /** 1-indexed line within the file. */
    line: number;
    physical: string;
    logical: string;
};

/** Render a violation the way the command line reports it. */
export function describePhysicalCSS(problem: PhysicalCSS): string {
    return `${problem.file}:${problem.line}  ${problem.physical} → use ${problem.logical}`;
}

/**
 * Every physical declaration in one file's `<style>` blocks. Separated from the
 * directory walk so it can be exercised against fixture strings — the escape
 * hatch and the two tiers are the parts most likely to rot unnoticed.
 */
export function checkStyleSource(rel: string, source: string): PhysicalCSS[] {
    if (rel in ALLOWLIST) return [];
    const styles = styleSource(source);
    if (styles === null) return [];
    const rules = TEXT_SURFACES.includes(rel)
        ? [...INLINE_RULES, ...BLOCK_RULES]
        : INLINE_RULES;
    // Read from the original source, since styleSource blanks comments out.
    const raw = source.split('\n');
    // A `physical:` comment exempts the declarations it introduces, through to
    // the end of its rule or the next blank line — the run it is plainly about.
    const exempted = new Set<number>();
    for (let i = 0; i < raw.length; i++) {
        if (!PHYSICAL_MARKER.test(raw[i])) continue;
        for (let j = i; j < raw.length; j++) {
            exempted.add(j);
            const after = raw[j + 1];
            if (after === undefined) break;
            if (after.trim() === '' || after.includes('}')) break;
        }
    }
    const found: PhysicalCSS[] = [];
    styles.split('\n').forEach((line, i) => {
        if (exempted.has(i)) return;
        for (const rule of rules)
            if (rule.pattern.test(line))
                found.push({
                    file: rel,
                    line: i + 1,
                    physical: rule.physical,
                    logical: rule.logical,
                });
    });
    return found;
}

/** Every physical declaration under `root`. The whole check, as data — so the
 *  sync test can call it directly rather than shelling out to this file. */
export function findPhysicalCSS(root = 'src'): PhysicalCSS[] {
    const base = path.isAbsolute(root) ? root : path.join(process.cwd(), root);
    return svelteFiles(base).flatMap((file) =>
        checkStyleSource(
            path.relative(process.cwd(), file),
            fs.readFileSync(file, 'utf8'),
        ),
    );
}

// Report and set an exit code only when run as a command; importing this module
// must have no side effects (scripts/updates.ts uses the same guard).
if (import.meta.url === `file://${process.argv[1]}`) {
    const violations = findPhysicalCSS();
    if (violations.length > 0) {
        console.error(
            `Found ${violations.length} physical CSS propert${violations.length === 1 ? 'y' : 'ies'} that should be logical (RTL-safe):\n`,
        );
        for (const v of violations)
            console.error(`  ${describePhysicalCSS(v)}`);
        console.error(
            '\nUse logical properties so the UI mirrors under RTL locales. If a case is genuinely physical, add it to ALLOWLIST in scripts/check-logical-css.ts with a reason.',
        );
        process.exit(1);
    } else {
        console.log('No physical (direction-unaware) CSS found. ✓');
    }
}
