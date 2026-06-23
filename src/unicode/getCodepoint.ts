export function getCodepointFromString(text: string) {
    // A codepoint escape is 2–6 hex digits (matching the `@<hex>` grammar in
    // ConceptRegExPattern). `parseInt` is lenient and would read a leading hex
    // prefix (the "e" of "example") or a 1-letter name ("b"), turning a
    // non-codepoint `@`-link like `@example.com` or `@b` into a stray control
    // character when text literals resolve escapes (see TextLiteral.unescaped).
    if (!/^[0-9a-fA-F]{2,6}$/.test(text)) return undefined;
    const code = parseInt(text, 16);
    // Use the codepoint (not the UTF-16 unit), so astral escapes like `@1F600`
    // (😀) aren't truncated. Reject NUL, surrogate halves, and out-of-range
    // values so `fromCodePoint` never throws or yields a lone surrogate.
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
        return undefined;
    return String.fromCodePoint(code);
}
