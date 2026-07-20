/**
 * Automates step C of the emoji-update procedure (see scripts/emoji/README.md):
 * fetch Google's Noto Color Emoji partition and regenerate BOTH color-emoji
 * branches of emoji-faces.css from it — the Chromium COLRv1 branch (`@supports
 * not (-webkit-hyphens: none)`, woff2) and the Safari OT-SVG branch (`@supports
 * (-webkit-hyphens: none)`, ttf). Regenerating both from one source keeps the
 * two browsers' declared ranges from drifting apart on an update.
 *
 * Google serves the family as N `unicode-range`-sliced woff2 files (the
 * "captured partition"). We download each to NotoColorEmoji-400-<i>.woff2 and
 * emit both branches, applying the fixed KEYCAP_TRIM so the color font doesn't
 * paint plain digits/#/* as emoji (re-declared on the dedicated keycap face).
 * slice-emoji-svg.py then cuts the Safari .svg-<i>.ttf files from these ranges.
 *
 * The default run also re-derives the monochrome `Noto Emoji` face's range from
 * its (separately refreshed) woff2 cmap, so one step keeps every emoji font's
 * declared coverage in emoji-faces.css in sync.
 *
 * The Safari SVG font has a few standalone glyphs the Chromium partition omits
 * (ZWJ sequences there, e.g. 👪); those gaps are only knowable after the font is
 * rebuilt, so --fold-safari-gaps runs post-build to fold them into GAP_SLICE.
 *
 * Modes:
 *   (default)          fetch from Google, write woff2 + regenerate both branches
 *   --fold-safari-gaps read the rebuilt SVG font's cmap and fold its gap
 *                      codepoints into the Safari branch's GAP_SLICE (post-build)
 *   --selftest         offline: reconstruct the partition from the committed CSS,
 *                      re-emit + fold gaps + re-derive the mono range, and assert
 *                      byte-for-byte identity — the range-regeneration faithfulness guard
 *
 * Run via `npm run emoji-update` (fonts half); or directly with
 * `npx tsx scripts/emoji/downloadColorEmoji.ts [--selftest|--fold-safari-gaps]`.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    EMOJI_BLOCKS,
    EMOJI_FORMAT,
    EMOJI_WHOLE_FILE,
    deriveEmojiRange,
    parseRangeString,
    readCharacterSet,
    toRangeString,
} from '../fonts/deriveRange';

const CSS_PATH = 'src/basis/faces/emoji-faces.css';
const FONT_DIR = 'static/fonts/NotoColorEmoji';
const GOOGLE_FAMILY = 'Noto Color Emoji';
const COLOR_FACE = 'Noto Color Emoji';
const KEYCAP_FACE = 'Noto Emoji Keycap';

/** Same UA start.ts uses so Google's css2 serves the COLRv1 woff2 slices. */
const CHROME_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Keycap-base + legacy text-default codepoints trimmed from the color slice
 * that ships them, so 'Noto Color Emoji' (ahead of Noto Sans in the cascade)
 * doesn't render plain "#4"/digits as emoji. Re-declared on the keycap face.
 * U+20E3 (keycap combiner) is deliberately NOT trimmed — harmless without a
 * base. This is the trim POLICY as data; a Noto update changes ranges, not this. */
const KEYCAP_TRIM = new Set<number>([
    0x23, // #
    0x2a, // *
    0x30,
    0x31,
    0x32,
    0x33,
    0x34,
    0x35,
    0x36,
    0x37,
    0x38,
    0x39, // 0-9
    0xa9, // ©
    0xae, // ®
    0x203c, // ‼
    0x2049, // ⁉
    0x2122, // ™
    0x2139, // ℹ
]);
/** The keycap face's declared range: the trim set (ascending) plus the selector
 * U+FE0F and combiner U+20E3 appended in that authored order, so sequences like
 * 2️⃣ #️⃣ ©️ shape in color. Derived (not a literal) so a trim edit can't drift. */
const KEYCAP_RANGE = `${toRangeString(KEYCAP_TRIM)}, U+fe0f, U+20e3`;

// The two color-emoji branches carry the SAME partition — Chromium serves it as
// COLRv1 woff2, Safari as OT-SVG ttf (Safari can't do COLRv1). We regenerate
// BOTH here so an update can't leave one browser's declared ranges stale while
// the other's move (which would tofu the new emoji on the stale browser).
const CHROMIUM_SUPPORTS = '@supports not (-webkit-hyphens: none)';
const SAFARI_SUPPORTS = '@supports (-webkit-hyphens: none)';

// Comments reproduced verbatim from the committed island — they encode WHY the
// trim exists, so keep them next to the machine-generated ranges.
const CHROMIUM_SLICE_TRIM_COMMENT = `        /* Trimmed: removed U+23 #, U+2A *, U+30-39 digits, U+A9 ©,
           U+AE ®, U+203C ‼, U+2049 ⁉, U+2122 ™, U+2139 ℹ. With
           MarkupHTMLView listing 'Noto Color Emoji' before Noto Sans,
           these ASCII/symbol codepoints would otherwise be drawn by
           the colored keycap-base glyphs from this slice (e.g. "#4"
           in plain text rendered as emoji-styled "#4"). They now fall
           through to Noto Sans. Trade-off: keycap emoji (1️⃣ #️⃣ etc.)
           no longer assemble in color in Chromium. Kept U+20E3 because
           it's harmless without a base. */`;
const CHROMIUM_KEYCAP_COMMENT = `        /* Dedicated face that DOES claim the keycap-base and legacy
           text-default codepoints (U+23 #, U+2A *, U+30-39 digits,
           U+A9 ©, U+AE ®, U+203C ‼, U+2049 ⁉, U+2122 ™, U+2139 ℹ)
           plus U+FE0F and U+20E3 — slice 2 still ships these glyphs
           and the keycap GSUB ligatures; only its unicode-range
           declaration was trimmed. This face must ONLY be referenced
           via the .emoji-keycap class, never in a general font-family
           cascade — otherwise it shadows plain digits/text again (see
           the trimmed slice-2 range above). It lets sequences like
           2️⃣ #️⃣ ©️ shape as color emoji. */`;
const SAFARI_INTRO = `    /* Safari's color-emoji path. The OT-SVG font is sliced into 10 files by
       the SAME unicode-range partition as the Chromium COLRv1 slices below
       (built from the same Noto sources), so Safari lazily downloads only the
       slices whose emoji render instead of the whole ~3.3 MB font. Slices are
       produced by pyftsubset in scripts/emoji/notocolor.sh; ranges mirror the
       NotoColorEmoji-400-N faces and are cmap-guarded by emojiRange.test.ts. */`;
const SAFARI_KEYCAP_COMMENT = `    /* Keycap face — slice 2 carries the keycap glyphs + GSUB ligatures.
       Referenced ONLY via the .emoji-keycap class (see the Chromium keycap
       face), never in a general cascade, so it doesn't shadow plain digits. */`;
const SAFARI_TRAILING = `    body {
        --google-font-color-notocoloremoji: colrv1;
    }`;

/** The OT-SVG font occasionally has a standalone glyph the Chromium COLRv1
 * partition omits (composed as a ZWJ sequence there, e.g. U+1F46A 👪). Those
 * "gap" codepoints — discovered from the built SVG font's cmap — are folded into
 * this slice on BOTH the font (scripts/emoji/slice-emoji-svg.py, GAP_SLICE="8")
 * and the Safari CSS (--fold-safari-gaps), so keep the two in lockstep. */
const GAP_SLICE_INDEX = 8;

/** Per-branch policy: how a face's src is spelled and which comments it carries.
 * The partition (ranges) is shared; only these presentational bits differ. */
type Branch = {
    supports: string;
    intro?: string;
    trailing?: string;
    src: (fileIndex: number) => string[];
    sliceTrimComment?: string;
    keycapComment: string;
    /** Chromium puts the keycap note inside the face (between src and range);
     * Safari puts it as a standalone comment before the face. */
    keycapCommentPlacement: 'inside' | 'before';
};
const CHROMIUM: Branch = {
    supports: CHROMIUM_SUPPORTS,
    src: (i) => [
        `        src: url(/fonts/NotoColorEmoji/NotoColorEmoji-400-${i}.woff2)`,
        "            format('woff2');",
    ],
    sliceTrimComment: CHROMIUM_SLICE_TRIM_COMMENT,
    keycapComment: CHROMIUM_KEYCAP_COMMENT,
    keycapCommentPlacement: 'inside',
};
const SAFARI: Branch = {
    supports: SAFARI_SUPPORTS,
    intro: SAFARI_INTRO,
    trailing: SAFARI_TRAILING,
    src: (i) => [
        `        src: url(/fonts/NotoColorEmoji/NotoColorEmoji.svg-${i}.ttf)`,
        "            format('truetype');",
    ],
    // Safari's trimmed slice carries no per-slice comment (see committed island).
    keycapComment: SAFARI_KEYCAP_COMMENT,
    keycapCommentPlacement: 'before',
};

type Slice = { index: number; codepoints: Set<number> };

/** Extract the given `@supports … {` block (brace-matched). */
function blockRegion(
    css: string,
    supports: string,
): { start: number; end: number } {
    const at = css.indexOf(`${supports} {`);
    if (at < 0) throw new Error(`No "${supports}" block in ${CSS_PATH}`);
    const open = css.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}' && --depth === 0)
            return { start: at, end: i + 1 };
    }
    throw new Error('Unbalanced braces in emoji-faces.css');
}

/** Parse the woff2 (Chromium) @font-faces in a fragment into
 * {family, fileIndex, range}. The woff2 branch is the reconstruction source. */
function parseFaces(
    fragment: string,
): { family: string; fileIndex: number; range: string }[] {
    const faces: { family: string; fileIndex: number; range: string }[] = [];
    for (const m of fragment.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
        const body = m[1];
        const family = body.match(/font-family:\s*'([^']+)'/)?.[1];
        const file = body.match(/NotoColorEmoji-400-(\d+)\.woff2/)?.[1];
        const range = body.match(/unicode-range:\s*([^;]+);/)?.[1];
        if (family === undefined || file === undefined || range === undefined)
            continue;
        faces.push({
            family,
            fileIndex: Number(file),
            range: range.replace(/\s+/g, ' ').trim(),
        });
    }
    return faces;
}

/** One `@font-face` rule at the island's indentation. */
function faceRule(
    family: string,
    src: string[],
    range: string,
    comment?: string,
): string {
    return [
        '    @font-face {',
        `        font-family: '${family}';`,
        '        font-style: normal;',
        '        font-weight: 400;',
        '        font-display: swap;',
        ...src,
        ...(comment ? [comment] : []),
        `        unicode-range: ${range};`,
        '    }',
    ].join('\n');
}

/** The slice that carries the keycap bases (contains U+30). */
function keycapSliceIndex(slices: Slice[]): number {
    const s = slices.find((x) => x.codepoints.has(0x30));
    if (!s)
        throw new Error(
            'No slice contains U+30 — cannot locate the keycap-base slice.',
        );
    return s.index;
}

/** Emit one `@supports` block for a branch from the RAW (pre-trim) partition.
 * `gaps` (Safari only) adds standalone SVG-only codepoints to GAP_SLICE_INDEX. */
function emitBranch(
    rawSlices: Slice[],
    branch: Branch,
    gaps?: ReadonlySet<number>,
): string {
    const k = keycapSliceIndex(rawSlices);
    const rules = rawSlices
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((s) => {
            const src = branch.src(s.index);
            const withGaps =
                gaps && s.index === GAP_SLICE_INDEX
                    ? new Set([...s.codepoints, ...gaps])
                    : s.codepoints;
            if (s.index !== k)
                return faceRule(COLOR_FACE, src, toRangeString(withGaps));
            const trimmed = [...withGaps].filter((cp) => !KEYCAP_TRIM.has(cp));
            return faceRule(
                COLOR_FACE,
                src,
                toRangeString(trimmed),
                branch.sliceTrimComment,
            );
        });
    const keycapRule = faceRule(
        KEYCAP_FACE,
        branch.src(k),
        KEYCAP_RANGE,
        branch.keycapCommentPlacement === 'inside'
            ? branch.keycapComment
            : undefined,
    );
    rules.push(
        branch.keycapCommentPlacement === 'before'
            ? `${branch.keycapComment}\n${keycapRule}`
            : keycapRule,
    );
    const parts = [`${branch.supports} {`];
    if (branch.intro) parts.push(branch.intro);
    parts.push(...rules);
    if (branch.trailing) parts.push(branch.trailing);
    parts.push('}');
    return parts.join('\n');
}

/** Regenerate BOTH color-emoji branches of the CSS from the raw partition. The
 * Chromium branch is the Google partition verbatim; the Safari branch mirrors it
 * plus any `safariGaps` folded into GAP_SLICE (see foldSafariGaps). */
function regenerate(
    css: string,
    rawSlices: Slice[],
    safariGaps?: ReadonlySet<number>,
): string {
    let out = css;
    const emit = (b: Branch) =>
        emitBranch(rawSlices, b, b === SAFARI ? safariGaps : undefined);
    for (const branch of [CHROMIUM, SAFARI]) {
        const { start, end } = blockRegion(out, branch.supports);
        out = out.slice(0, start) + emit(branch) + out.slice(end);
    }
    return out;
}

/** Regenerate the monochrome `Noto Emoji` @font-face's unicode-range from the
 * current mono woff2's cmap (cmap ∩ emoji blocks + format chars). The mono font
 * is refreshed by download-mono-emoji.py just before this runs, so its declared
 * range tracks its coverage — guarded by emojiRange.test.ts. The mono face is
 * the one whose family is exactly `'Noto Emoji'` (not `'Noto Color Emoji'` /
 * `'Noto Emoji Keycap'`), so match that with the closing quote+semicolon. */
async function regenerateMonoRange(css: string): Promise<string> {
    const range = await deriveEmojiRange(EMOJI_WHOLE_FILE['Noto Emoji']);
    const re =
        /(@font-face\s*\{[^}]*font-family:\s*'Noto Emoji';[^}]*unicode-range:\s*)[^;]+(;)/;
    if (!re.test(css))
        throw new Error(
            `mono 'Noto Emoji' @font-face not found in ${CSS_PATH}`,
        );
    return css.replace(re, `$1${range}$2`);
}

/** Gap codepoints the built OT-SVG font has a glyph for but the Chromium
 * partition doesn't declare — mirrors slice-emoji-svg.py's gap computation so
 * the Safari CSS and the sliced font files agree on what GAP_SLICE carries. */
async function computeSafariGaps(css: string): Promise<Set<number>> {
    const inBlocks = (cp: number) =>
        EMOJI_BLOCKS.some(([a, b]) => cp >= a && cp <= b);
    const isFormat = (cp: number) =>
        EMOJI_FORMAT.some(([a, b]) => cp >= a && cp <= b);
    const cmap = await readCharacterSet(EMOJI_WHOLE_FILE['Noto Color Emoji']);
    const { start, end } = blockRegion(css, CHROMIUM_SUPPORTS);
    const union = new Set<number>();
    for (const f of parseFaces(css.slice(start, end)))
        if (f.family === COLOR_FACE)
            for (const cp of parseRangeString(f.range)) union.add(cp);
    return new Set(
        cmap.filter((cp) => inBlocks(cp) && !union.has(cp) && !isFormat(cp)),
    );
}

/** Re-emit the Safari branch with the built font's gap codepoints folded into
 * GAP_SLICE. Run AFTER the font rebuild (the gaps depend on the built cmap). */
async function foldSafariGaps(css: string): Promise<string> {
    const gaps = await computeSafariGaps(css);
    if (gaps.size > 0)
        console.log(
            `Folding ${gaps.size} SVG-only gap codepoint(s) into Safari slice ${GAP_SLICE_INDEX}: ` +
                [...gaps]
                    .sort((a, b) => a - b)
                    .map((c) => 'U+' + c.toString(16))
                    .join(', '),
        );
    return regenerate(css, rawSlicesFromCss(css), gaps);
}

/** Reconstruct the raw (pre-trim) partition from the committed island's Chromium
 * (woff2) branch, for the self-test: add KEYCAP_TRIM back into the keycap-base
 * slice and drop the separate keycap face. regenerate(reconstruct(committed))
 * must equal committed. */
function rawSlicesFromCss(css: string): Slice[] {
    const { start, end } = blockRegion(css, CHROMIUM_SUPPORTS);
    const faces = parseFaces(css.slice(start, end));
    const keycap = faces.find((f) => f.family === KEYCAP_FACE);
    if (!keycap) throw new Error('No keycap face in committed island.');
    return faces
        .filter((f) => f.family === COLOR_FACE)
        .map((f) => {
            const cps = new Set(parseRangeString(f.range));
            if (f.fileIndex === keycap.fileIndex)
                for (const cp of KEYCAP_TRIM) cps.add(cp);
            return { index: f.fileIndex, codepoints: cps };
        });
}

/** Prettier-normalize a CSS string (matches the committed file's canonical
 * formatting so comparisons are format-independent). The temp file lives beside
 * the real CSS so prettier resolves the project .prettierrc + the css parser. */
function prettify(css: string): string {
    const tmp = path.join(
        path.dirname(CSS_PATH),
        `.emoji-faces-tmp-${process.pid}.css`,
    );
    fs.writeFileSync(tmp, css);
    try {
        execFileSync('npx', ['prettier', '--write', tmp], { stdio: 'ignore' });
        return fs.readFileSync(tmp, 'utf8');
    } finally {
        fs.rmSync(tmp, { force: true });
    }
}

async function selftest(): Promise<void> {
    const committed = fs.readFileSync(CSS_PATH, 'utf8');
    // Reproduce the committed island end to end exactly as a real run does:
    // regenerate both color branches, fold the committed SVG font's gaps into
    // Safari GAP_SLICE, and re-derive the mono face's range from its cmap. This
    // guards the emitter, the branch structure, the gap fold, AND that the mono
    // range regex targets only the mono face and matches the font's coverage.
    const regenerated = prettify(
        await regenerateMonoRange(
            await foldSafariGaps(
                regenerate(committed, rawSlicesFromCss(committed)),
            ),
        ),
    );
    if (regenerated === committed) {
        console.log(
            'downloadColorEmoji self-test: emitter, gap fold, and mono range faithfully reproduce the committed emoji-faces.css. ✓',
        );
        return;
    }
    console.error(
        'downloadColorEmoji self-test FAILED: regenerated CSS differs from committed.',
    );
    const a = committed.split('\n');
    const b = regenerated.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++)
        if (a[i] !== b[i]) {
            console.error(`  first diff at line ${i + 1}:`);
            console.error(`    committed:    ${JSON.stringify(a[i])}`);
            console.error(`    regenerated:  ${JSON.stringify(b[i])}`);
            break;
        }
    process.exit(1);
}

async function fetchGoogleCss(): Promise<string> {
    const url = `https://fonts.googleapis.com/css2?family=${GOOGLE_FAMILY.replaceAll(' ', '+')}:wght@400&display=swap`;
    const res = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
    if (!res.ok)
        throw new Error(`Google css2 for ${GOOGLE_FAMILY}: HTTP ${res.status}`);
    return res.text();
}

async function download(): Promise<void> {
    const css = await fetchGoogleCss();
    // Google returns the slices in partition order; number them 0..N.
    const blocks = [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)];
    const rawSlices: Slice[] = [];
    let i = 0;
    for (const m of blocks) {
        const body = m[1];
        const srcUrl = body.match(/src:\s*url\(([^)]+)\)/)?.[1];
        const range = body.match(/unicode-range:\s*([^;]+);/)?.[1];
        if (!srcUrl || !range) continue;
        const font = await fetch(srcUrl, {
            headers: { 'User-Agent': CHROME_UA },
        });
        if (!font.ok)
            throw new Error(`slice ${i} (${srcUrl}): HTTP ${font.status}`);
        fs.writeFileSync(
            path.join(FONT_DIR, `NotoColorEmoji-400-${i}.woff2`),
            Buffer.from(await font.arrayBuffer()),
        );
        rawSlices.push({
            index: i,
            codepoints: new Set(parseRangeString(range)),
        });
        i++;
    }
    if (rawSlices.length === 0)
        throw new Error('Google css2 returned no woff2 slices.');
    console.log(`Downloaded ${rawSlices.length} Noto Color Emoji slice(s).`);

    const before = fs.readFileSync(CSS_PATH, 'utf8');
    // Regenerate the color partition (both branches) AND the mono face's range
    // from the current fonts, so emoji-faces.css tracks every emoji font at once.
    const after = prettify(
        await regenerateMonoRange(regenerate(before, rawSlices)),
    );
    fs.writeFileSync(CSS_PATH, after);
    // Round-trip the fresh CSS to guarantee the emitter stayed faithful.
    const roundtrip = prettify(regenerate(after, rawSlicesFromCss(after)));
    if (roundtrip !== after)
        throw new Error(
            'Regenerated CSS does not round-trip — emitter/partition mismatch.',
        );
    console.log(
        `Regenerated both color-emoji branches of ${CSS_PATH} (${rawSlices.length} slices + keycap; Safari mirrors Chromium, gaps folded later).`,
    );
    console.log(
        'Next: run scripts/emoji/notocolor.sh to re-slice the Safari SVG font, then --fold-safari-gaps.',
    );
}

/** Post-font-build step: fold the rebuilt SVG font's gap codepoints into the
 * Safari branch and write. */
async function foldGapsMode(): Promise<void> {
    const before = fs.readFileSync(CSS_PATH, 'utf8');
    const after = prettify(await foldSafariGaps(before));
    fs.writeFileSync(CSS_PATH, after);
    console.log(`Folded Safari gaps into ${CSS_PATH}.`);
}

const mode = process.argv[2];
const run =
    mode === '--selftest'
        ? selftest()
        : mode === '--fold-safari-gaps'
          ? foldGapsMode()
          : download();
run.catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
