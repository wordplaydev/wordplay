/**
 * The inverse of `parseSerializedProject` in `examples.ts`: renders a `.wp`
 * example file from its parsed pieces. `Project.toWordplay()` is not usable
 * here because it omits the preview-glyph line and re-spaces sources.
 *
 * Framing must mirror the parser exactly: the parser splits the text after the
 * name line on a lookahead before each `=== ` header line, so every source's
 * code carries the trailing newline(s) that separated it from the next header.
 * Sources are therefore joined with nothing, and a non-final source whose code
 * lacks a trailing newline gets one so its successor's header starts a line.
 *
 * Two constructs cannot round-trip and callers must avoid them: a code or doc
 * line beginning `=== ` (the parser would split there), and a glyphless file
 * whose name is a single grapheme (the parser would read it as the glyph).
 */
export function serializeExample(
    previewGlyph: string | undefined,
    name: string,
    sources: { names: string; code: string }[],
): string {
    return (
        (previewGlyph !== undefined ? `${previewGlyph}\n` : '') +
        `${name}\n` +
        sources
            .map(
                (source, index) =>
                    // A nameless source's header is a bare `===`, as the
                    // parser reads it; `=== ` with nothing after would parse
                    // back the same but changes the bytes.
                    (source.names === '' ? '===' : `=== ${source.names}`) +
                    `\n${source.code}` +
                    (index < sources.length - 1 && !source.code.endsWith('\n')
                        ? '\n'
                        : ''),
            )
            .join('')
    );
}
