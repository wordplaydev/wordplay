export function getCodepointFromString(text: string) {
    // A codepoint escape is 2–6 hex digits (the segment after `U/` in a
    // `@U/<hex>` codepoint reference; see ConceptLink.parse). `parseInt` is
    // lenient and would read a leading hex prefix (the "e" of "example") or a
    // 1-letter name ("b"), so require the whole segment to be hex.
    if (!/^[0-9a-fA-F]{2,6}$/.test(text)) return undefined;
    const code = parseInt(text, 16);
    // Use the codepoint (not the UTF-16 unit), so astral escapes like
    // `@U/1F600` (😀) aren't truncated. Reject NUL, surrogate halves, and
    // out-of-range values so `fromCodePoint` never throws or yields a lone
    // surrogate.
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
        return undefined;
    return String.fromCodePoint(code);
}
