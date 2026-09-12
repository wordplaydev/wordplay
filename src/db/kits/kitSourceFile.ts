import UnicodeString from '@unicode/UnicodeString';

/**
 * Reading and writing a built-in kit's `.wp` file.
 *
 * Separate from `builtins.ts` because that module imports each kit's source with Vite's
 * `?raw`, which only exists in a Vite build — the locale CLI runs under `tsx`, where the
 * same import fails with "Unknown file extension .wp". These two functions are pure text,
 * so both sides can share them.
 */

/**
 * A built-in kit's file, split into the parts a version stores.
 *
 * The same header an example carries: an optional single-grapheme preview glyph on the
 * first line, then `=== <names>` giving the source's names — which carry the locale tags
 * that say what language the kit is written in — then the code.
 */
export function parseBuiltinKitSource(text: string): {
    glyph: string | undefined;
    names: string;
    code: string;
} {
    const lines = text.split('\n');
    let index = 0;
    let glyph: string | undefined = undefined;
    const first = lines[0]?.trim() ?? '';
    if (!first.startsWith('===')) {
        // A preview glyph is exactly one grapheme, the rule `parsePreviewLine` applies to
        // an example. Anything else on that line is not a glyph and is left alone.
        if (new UnicodeString(first).getLength() === 1) glyph = first;
        index = 1;
    }
    return {
        glyph,
        names: (lines[index] ?? '').replace(/^===\s*/, '').trim(),
        code: lines
            .slice(index + 1)
            .join('\n')
            .trim(),
    };
}

/**
 * The inverse of {@link parseBuiltinKitSource}, for the tool that writes translations
 * back into a kit's file. Keeps the glyph line and the header verbatim — only the code
 * between them is ever rewritten.
 */
export function serializeBuiltinKitSource(
    glyph: string | undefined,
    names: string,
    code: string,
): string {
    return `${glyph === undefined ? '' : `${glyph}\n`}=== ${names}\n${code.trim()}\n`;
}
