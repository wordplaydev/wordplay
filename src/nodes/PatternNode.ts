import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import Characters from '../lore/BasisCharacters';
import Node from '@nodes/Node';

/**
 * Abstract base for the internal nodes of a pattern literal `⣿ … ⣿` (see
 * LANGUAGE.md). These are NOT {@link Expression}s — they have no standalone
 * value or type; they describe how to match text. Only the top-level
 * {@link PatternLiteral} is an expression. Giving each construct a real
 * grammar still gives it structural editing, autocomplete, and localized docs.
 *
 * Matching does not live on these nodes: the matcher in `@runtime/pattern`
 * walks this AST directly (a generator yielding one step per grapheme probe),
 * driven by the `≈`/`⌕` operators so a match is observable step-by-step.
 */
export default abstract class PatternNode extends Node {
    getPurpose() {
        return Purpose.Patterns;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    getCharacter() {
        return Characters.Pattern;
    }
}
