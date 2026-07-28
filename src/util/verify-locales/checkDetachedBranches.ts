/**
 * A branch (`$name[when defined|when not]`) must be attached directly to its
 * mention. A space between them (`$name [when defined|when not]`) detaches it:
 * the parser produces no Branch, the brackets render as literal text, and — the
 * reason this matters — an undefined input then makes the whole template
 * unparsable, so the UI shows and screen readers speak "Unparsable template: …".
 *
 * Machine translation introduced this in most locales (the caret's `between`
 * string was the one a VoiceOver pass caught), so it's checked rather than
 * merely fixed.
 */

/** `$name` followed by whitespace and a bracket group containing a `|`. */
const DetachedBranch = /\$[a-zA-Z][a-zA-Z0-9]*\s+\[[^\]]*\|[^\]]*\]/g;

/** Every detached branch in the given template text, for error reporting. */
export default function checkDetachedBranches(text: string): string[] {
    return [...text.matchAll(DetachedBranch)].map((match) => match[0]);
}
