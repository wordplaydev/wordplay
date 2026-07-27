import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
import { ConceptRegExPattern } from '@parser/Tokenizer';

/**
 * A chunk of a plain-text string: either literal text or a custom-character
 * reference (e.g. @username/charname). Used to measure and render plain text
 * containing character references (#773). Codepoint references (@U/1F600) are
 * already resolved to real characters during TextLiteral evaluation, and
 * non-character references (concept/UI/how links) are left as literal text.
 */
export type TextChunk =
    | { kind: 'text'; text: string }
    | { kind: 'character'; name: CharacterName; ref: string };

const ReferencePattern = new RegExp(ConceptRegExPattern, 'gu');

/** Split a plain string into text and custom-character-reference chunks. */
export function splitCharacterRefs(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let last = 0;
    for (const match of text.matchAll(ReferencePattern)) {
        const index = match.index ?? 0;
        const ref = match[0];
        const parsed = ConceptLink.parse(ref.slice(1));
        // Only custom characters render as a glyph; everything else stays text.
        if (parsed instanceof CharacterName) {
            if (index > last)
                chunks.push({ kind: 'text', text: text.slice(last, index) });
            chunks.push({ kind: 'character', name: parsed, ref });
            last = index + ref.length;
        }
    }
    if (last < text.length)
        chunks.push({ kind: 'text', text: text.slice(last) });
    return chunks;
}
