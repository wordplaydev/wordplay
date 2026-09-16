/**
 * The optional metadata block in a `.wp` file, and the only place that knows
 * its syntax (#152).
 *
 * A project file carries a creator's program, but three of the things that
 * make it *their* project live nowhere in the text: the locales the project
 * declares, and whether its preview glyph was pinned by hand or computed. A
 * preamble is what lets a file be brought back as the project it was rather
 * than as a program that happens to have the same code.
 *
 * ## Shape
 *
 * `@key value` lines, after the name line and before the first `=== ` header:
 *
 * ```
 * 🐈
 * "Cat"/en
 * @locales en-US es-MX
 * @preview manual
 * === start/en
 * Phrase('hi')
 * ```
 *
 * Unknown keys are ignored rather than refused. That, rather than a version
 * number, is the forward-compatibility story: a file written by a later
 * Wordplay still opens here, minus whatever this version has not heard of.
 *
 * ## Why this position is load-bearing
 *
 * A preamble is the one position in the format that can corrupt a file
 * *silently* for a reader that does not know about it. `parseSerializedProject`
 * splits on `=== ` lookaheads, so a block of lines before the first header
 * becomes a phantom source at index 0 — and index 0 is the project's main
 * source. The stage would render nothing, with no exception thrown.
 *
 * That is survivable only because a preamble is written into **exported project
 * files alone**, never into `static/examples/**` or `src/db/kits/sources/**`,
 * which are the only `.wp` files the other two parsers in this repo ever read.
 * `corpusPreamble.test.ts` asserts that, and it is the whole of the guarantee —
 * if it ever fails, the fix is to remove the preamble from the corpus, not to
 * relax the test.
 */

/** Whether a creator pinned the preview glyph, or Wordplay computed it. */
export type PreviewMode = 'auto' | 'manual';

/** What a preamble can say. Every field optional: a file that declares nothing
 *  is an ordinary `.wp`, and that is the overwhelmingly common case. */
export type Preamble = {
    /** The locales the project declares it is written in, in priority order.
     *  Declared rather than derived: a project may declare a locale whose text
     *  failed to load, and deriving from source-name tags would lose it. */
    locales?: string[];
    /** Present only when `manual` — an auto preview is a cache, and saying so
     *  in the file would be recording something Wordplay recomputes anyway. */
    preview?: PreviewMode;
};

/**
 * A preamble line: `@`, a lowercase key, then a space and a value, or nothing.
 *
 * Anchored and deliberately narrow. A line the creator wrote that merely begins
 * with `@` — markup can — must not be mistaken for metadata, and the parser
 * stops at the first line that does not match rather than scanning ahead.
 */
const PreambleLine = /^@([a-z]+)(?:[ \t]+(.*))?$/;

/** Reads the preamble at the top of these lines, and says where it ends.
 *  `end` is the index of the first line that is not preamble, so a caller can
 *  carry on parsing from there without knowing the syntax. */
export function parsePreamble(lines: string[]): {
    preamble: Preamble;
    end: number;
} {
    const preamble: Preamble = {};
    let end = 0;

    for (const line of lines) {
        const match = PreambleLine.exec(line);
        if (match === null) break;
        const [, key, value = ''] = match;
        const trimmed = value.trim();
        if (key === 'locales') {
            const codes = trimmed.split(/\s+/).filter((c) => c.length > 0);
            // An empty list is not a declaration of nothing — it is a line
            // with nothing on it, and deriving from the headers is the better
            // answer than declaring a project has no locales at all.
            if (codes.length > 0) preamble.locales = codes;
        } else if (key === 'preview') {
            if (trimmed === 'manual') preamble.preview = 'manual';
        }
        // Any other key: ignored on purpose. See the module comment.
        end++;
    }

    return { preamble, end };
}

/** The preamble's lines, each ending in a newline, or the empty string when
 *  there is nothing to say. Written in a fixed order so two exports of one
 *  project produce identical bytes. */
export function serializePreamble(preamble: Preamble): string {
    const lines: string[] = [];
    if (preamble.locales !== undefined && preamble.locales.length > 0)
        lines.push(`@locales ${preamble.locales.join(' ')}`);
    // Only `manual` is written: `auto` is what a file with no preview line
    // already means.
    if (preamble.preview === 'manual') lines.push('@preview manual');
    return lines.map((line) => `${line}\n`).join('');
}
