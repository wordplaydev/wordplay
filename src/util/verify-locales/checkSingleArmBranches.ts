/**
 * A presence branch (`$name[when defined|when not]`) needs both arms. With only
 * one (`$name[when defined]`) there is nothing to select when the input is
 * undefined, and the whole template becomes unparsable — so the UI shows and
 * screen readers speak "Unparsable template: …" (found via `Pose.description`'s
 * `$blur[…]`, which every locale had, so a `Phrase` with no blur was described
 * as an error).
 *
 * `verifyLocale` concretizes each template with every input *defined*, so it
 * can't see this; the failure only happens on the absent path. Hence a
 * structural check, like its sibling {@link checkDetachedBranches}.
 *
 * Count branches (`$#name[…]`) are exempt: their arms are plural forms, and a
 * locale with a single plural form (Japanese, Korean, Vietnamese, …) correctly
 * has exactly one.
 */

/** A plain (non-count) mention immediately followed by a bracket group. */
const Mention = /\$(#?)([a-zA-Z][a-zA-Z0-9]*)\[/g;

/** Every single-armed presence branch in the given template text. */
export default function checkSingleArmBranches(text: string): string[] {
    const found: string[] = [];
    for (const match of text.matchAll(Mention)) {
        // A count's arms are plural forms, not presence arms.
        if (match[1] === '#') continue;
        // Scan to the matching close bracket, tracking nesting so a nested
        // branch's `|` doesn't count as this branch's separator.
        let depth = 1;
        let separated = false;
        let index = match.index + match[0].length;
        for (; index < text.length && depth > 0; index++) {
            const character = text[index];
            if (character === '[') depth++;
            else if (character === ']') depth--;
            else if (character === '|' && depth === 1) separated = true;
        }
        // An unclosed bracket isn't a branch at all; other checks cover it.
        if (depth === 0 && !separated)
            found.push(text.substring(match.index, index));
    }
    return found;
}
