import type Expression from '@nodes/Expression';
import Internal from '@runtime/Internal';
import type {
    MatchSnapshot,
    PatternMatch,
} from '@runtime/pattern/match';

/**
 * The scoped state of an in-progress pattern match (LANGUAGE.md): the matcher
 * generator, the text being matched as extended grapheme clusters, the latest
 * observed {@link MatchSnapshot}, and — once the generator is done — its result
 * (a boolean for `≈`, a list of {@link PatternMatch} for `⌕`).
 */
export type MatchLoop = {
    gen: Generator<MatchSnapshot, boolean | PatternMatch[], void>;
    /** The text being matched, as graphemes (for the position visualization). */
    graphemes: string[];
    /** The latest observed step (what the debugger and view show). */
    snapshot: MatchSnapshot | undefined;
    /** The final result once the generator is done. */
    result: boolean | PatternMatch[] | undefined;
    done: boolean;
};

/**
 * A dedicated {@link Internal} value for pattern match state, bound in scope
 * while `≈`/`⌕` step so the match is single-steppable like the rest of
 * evaluation. Subtyping Internal (rather than reusing a bare `Internal<…>`) lets
 * its value view ({@link PatternMatchView}) target exactly this state instead of
 * every internal value, and lets {@link getMatchLoop} narrow with `instanceof`.
 */
export default class MatchValue extends Internal<MatchLoop> {
    constructor(creator: Expression, state: MatchLoop) {
        super(creator, state);
    }
}
