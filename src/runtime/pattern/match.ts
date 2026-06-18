import type Node from '@nodes/Node';
import PatternAnchor from '@nodes/PatternAnchor';
import PatternBackref from '@nodes/PatternBackref';
import PatternCapture from '@nodes/PatternCapture';
import PatternCaseFold from '@nodes/PatternCaseFold';
import PatternClass from '@nodes/PatternClass';
import PatternComplement from '@nodes/PatternComplement';
import PatternGroup from '@nodes/PatternGroup';
import type PatternLiteral from '@nodes/PatternLiteral';
import PatternLiteralText from '@nodes/PatternLiteralText';
import PatternLook from '@nodes/PatternLook';
import PatternNode from '@nodes/PatternNode';
import PatternQuantified from '@nodes/PatternQuantified';
import type PatternQuantifier from '@nodes/PatternQuantifier';
import PatternRange from '@nodes/PatternRange';
import PatternRest from '@nodes/PatternRest';
import PatternSequence from '@nodes/PatternSequence';
import PatternSet from '@nodes/PatternSet';
import PatternWord from '@nodes/PatternWord';
import PatternWordEdge from '@nodes/PatternWordEdge';
import {
    MEASUREMENT_SYMBOL,
    PATTERN_AHEAD_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_SPACE_SYMBOL,
} from '@parser/Symbols';
import {
    resolveProperty,
    type GraphemePredicate,
} from '@runtime/pattern/properties';
import { getWordInfo } from '@runtime/pattern/segment';
import UnicodeString from '@unicode/UnicodeString';

/**
 * The pattern matching engine: a possessive PEG over extended grapheme clusters
 * (LANGUAGE.md). Greedy, NO backtracking — each step returns the single furthest
 * reachable state (or null), so matching is linear-time.
 *
 * The engine is written as a GENERATOR so it can be single-stepped by the
 * Evaluator: each leaf-atom attempt `yield`s a {@link MatchSnapshot} (the node
 * being tried, the current grapheme position, the captures so far), then the
 * Evaluator advances it one yield at a time (see TextBasis `≈`/`⌕`). The
 * synchronous {@link testPattern}/{@link searchPattern} drivers run the same
 * generator to completion for direct use/tests.
 *
 * Unicode properties (`/x`) and named classes resolve via the property registry
 * ({@link resolveProperty}); word/word-edge (`▭`/`┊`) resolve via locale
 * segmentation ({@link getWordInfo}). Per-node predicates and literal grapheme
 * decompositions are cached so they aren't rebuilt on every attempt/position.
 */

export type Capture = { text: string; start: number; end: number };
type Captures = Map<string, Capture>;
type State = { pos: number; caps: Captures };

/**
 * What the debugger can observe — and narrate — at each step of a match. Each
 * beat names the construct being tried, the grapheme position, and (for the
 * stepwise narration, LANGUAGE.md's observable requirement) the outcome:
 *  - `scan`: the search is about to try the pattern from this position.
 *  - `atom`: a leaf atom was tried against `glyph` at `pos`; `matched` is whether
 *    it fit (`glyph` is undefined when `pos` is at the end of the text).
 *  - `quantifier`: a quantifier finished after `count` repetitions; `matched` is
 *    whether `count` satisfied its bounds.
 */
export type MatchSnapshot = {
    node: PatternNode;
    pos: number;
    caps: Captures;
    kind: 'scan' | 'atom' | 'quantifier';
    matched?: boolean;
    glyph?: string;
    count?: number;
};

/** Build an `atom` beat: a leaf atom tried at `state.pos` with a known outcome. */
function atomBeat(
    node: PatternNode,
    state: State,
    matched: boolean,
    glyph?: string,
): MatchSnapshot {
    const beat: MatchSnapshot = {
        node,
        pos: state.pos,
        caps: state.caps,
        kind: 'atom',
        matched,
    };
    if (glyph !== undefined) beat.glyph = glyph;
    return beat;
}

export type PatternMatch = {
    start: number;
    end: number;
    text: string;
    caps: Captures;
};

/** A matcher generator: yields snapshots, returns the furthest state or null. */
type Matcher = Generator<MatchSnapshot, State | null, void>;

/**
 * Case-folding mode while matching: `false` = exact; a string = fold on, with
 * that BCP-47 locale for `toLocaleLowerCase` (`''` = the host default, e.g. a
 * bare `⇕`; `'tr'` for Turkic `i`/`İ`).
 */
type Fold = false | string;

export function graphemesOf(text: string): string[] {
    return new UnicodeString(text).getGraphemes();
}

// Base-class regexes, hoisted so they compile once rather than per predicate.
const DIGIT = /\p{Nd}/u;
const HORIZONTAL_SPACE = /[\t\p{Zs}]/u;
const LETTER = /\p{Alphabetic}/u;

/** The predicate for a base class glyph: `◌` any, `#` digit, `␣` space, `_` letter. */
function baseClassPredicate(base: string): GraphemePredicate {
    return base === PATTERN_ANY_SYMBOL
        ? () => true
        : base === MEASUREMENT_SYMBOL
          ? (grapheme) => DIGIT.test(grapheme)
          : base === PATTERN_SPACE_SYMBOL
            ? (grapheme) => HORIZONTAL_SPACE.test(grapheme)
            : (grapheme) => LETTER.test(grapheme);
}

/**
 * The predicate for a class atom (`_`, `◌/greek`, …): its base intersected with
 * an optional `/property`. An unrecognized property never matches (the parser
 * flags it as a conflict).
 */
function classPredicate(node: PatternClass): GraphemePredicate {
    const base = baseClassPredicate(node.base.getText());
    if (node.property === undefined) return base;
    const property = resolveProperty(
        node.property.name.getText(),
        node.property.value?.getText(),
    );
    return property === undefined
        ? () => false
        : (grapheme) => base(grapheme) && property(grapheme);
}

/** The predicate for a bare named class (`linebreak`, …); never matches if unknown. */
function namedClassPredicate(name: string): GraphemePredicate {
    return resolveProperty(name) ?? (() => false);
}

function foldEq(a: string, b: string, fold: Fold): boolean {
    if (a === b) return true;
    if (fold === false) return false;
    const locale = fold === '' ? undefined : fold;
    return a.toLocaleLowerCase(locale) === b.toLocaleLowerCase(locale);
}

/** One-grapheme membership test for a set member (class, range, literal, or named class). */
function memberPredicate(member: Node, fold: Fold): GraphemePredicate {
    if (member instanceof PatternClass) return classPredicate(member);
    if (member instanceof PatternRange) {
        const low = member.getLow().codePointAt(0) ?? 0;
        const high = member.getHigh().codePointAt(0) ?? 0;
        return (grapheme) => {
            const codepoint = grapheme.codePointAt(0) ?? -1;
            return codepoint >= low && codepoint <= high;
        };
    }
    if (member instanceof PatternLiteralText) {
        const literal = member.getCharacters();
        return (grapheme) => foldEq(grapheme, literal, fold);
    }
    // A bare named class in a set, e.g. `{":" linebreak}`.
    if (member instanceof PatternBackref)
        return namedClassPredicate(member.name.getText());
    return () => false;
}

// A literal's grapheme decomposition is constant, so cache it per node rather
// than re-segmenting on every match attempt and every search start position.
const literalGraphemeCache = new WeakMap<PatternLiteralText, string[]>();
function literalGraphemes(node: PatternLiteralText): string[] {
    let cached = literalGraphemeCache.get(node);
    if (cached === undefined) {
        cached = graphemesOf(node.getCharacters());
        literalGraphemeCache.set(node, cached);
    }
    return cached;
}

// A set's member predicates depend only on (node, fold), so cache them rather
// than rebuilding the predicate list every time the set is probed.
const setPredicateCache = new WeakMap<
    PatternSet,
    Map<Fold, GraphemePredicate[]>
>();
function setMemberPredicates(
    node: PatternSet,
    fold: Fold,
): GraphemePredicate[] {
    let byFold = setPredicateCache.get(node);
    if (byFold === undefined) {
        byFold = new Map();
        setPredicateCache.set(node, byFold);
    }
    let predicates = byFold.get(fold);
    if (predicates === undefined) {
        predicates = node.members.map((member) =>
            memberPredicate(member, fold),
        );
        byFold.set(fold, predicates);
    }
    return predicates;
}

function quantifierBounds(quantifier: PatternQuantifier): [number, number] {
    const low = Number(quantifier.low.getText());
    const high = quantifier.high
        ? Number(quantifier.high.getText())
        : undefined;
    switch (quantifier.relation?.getText()) {
        case undefined:
            return high !== undefined ? [low, high] : [low, low];
        case '>':
            return [low + 1, Infinity];
        case '≥':
            return [low, Infinity];
        case '<':
            return [0, Math.max(0, low - 1)];
        case '≤':
            return [0, low];
        default: // '='
            return [low, low];
    }
}

/** Match a single node; yields a snapshot at each leaf atom attempt. */
function* matchNode(
    node: PatternNode,
    graphemes: string[],
    state: State,
    fold: Fold,
): Matcher {
    if (node instanceof PatternSequence)
        return yield* matchSeq(node, graphemes, state, fold);
    if (node instanceof PatternGroup)
        return yield* matchSeq(node.body, graphemes, state, fold);

    if (node instanceof PatternClass) {
        const matches = classPredicate(node);
        const here = graphemes[state.pos];
        const ok = state.pos < graphemes.length && matches(here);
        yield atomBeat(node, state, ok, here);
        return ok ? { pos: state.pos + 1, caps: state.caps } : null;
    }

    if (node instanceof PatternLiteralText) {
        const literal = literalGraphemes(node);
        let ok = state.pos + literal.length <= graphemes.length; // off the end?
        for (let index = 0; ok && index < literal.length; index++)
            if (!foldEq(graphemes[state.pos + index], literal[index], fold))
                ok = false;
        const here = graphemes
            .slice(state.pos, state.pos + literal.length)
            .join('');
        yield atomBeat(node, state, ok, here.length > 0 ? here : undefined);
        return ok ? { pos: state.pos + literal.length, caps: state.caps } : null;
    }

    if (node instanceof PatternRest) {
        yield atomBeat(node, state, true, graphemes.slice(state.pos).join(''));
        return { pos: graphemes.length, caps: state.caps };
    }

    if (node instanceof PatternAnchor) {
        const isEnd = node.anchor.getText() === PATTERN_END_SYMBOL;
        const ok = isEnd ? state.pos === graphemes.length : state.pos === 0;
        yield atomBeat(node, state, ok);
        return ok ? state : null;
    }

    if (node instanceof PatternSet) {
        const predicates = setMemberPredicates(node, fold);
        const here = graphemes[state.pos];
        const ok =
            state.pos < graphemes.length &&
            predicates.some((matches) => matches(here));
        yield atomBeat(node, state, ok, here);
        return ok ? { pos: state.pos + 1, caps: state.caps } : null;
    }

    if (node instanceof PatternBackref) {
        const name = node.name.getText();
        const capture = state.caps.get(name);
        if (capture !== undefined) {
            // A backreference: match the same text the capture matched.
            const literal = graphemesOf(capture.text);
            let ok = state.pos + literal.length <= graphemes.length;
            for (let index = 0; ok && index < literal.length; index++)
                if (!foldEq(graphemes[state.pos + index], literal[index], fold))
                    ok = false;
            const here = graphemes
                .slice(state.pos, state.pos + literal.length)
                .join('');
            yield atomBeat(node, state, ok, here.length > 0 ? here : undefined);
            return ok
                ? { pos: state.pos + literal.length, caps: state.caps }
                : null;
        }
        // Otherwise a bare named class (e.g. `linebreak`).
        const namedClass = namedClassPredicate(name);
        const here = graphemes[state.pos];
        const ok = state.pos < graphemes.length && namedClass(here);
        yield atomBeat(node, state, ok, here);
        return ok ? { pos: state.pos + 1, caps: state.caps } : null;
    }

    if (node instanceof PatternQuantified) {
        const [minimum, maximum] = quantifierBounds(node.quantifier);
        let current = state;
        let count = 0;
        while (count < maximum) {
            const next = yield* matchNode(node.atom, graphemes, current, fold);
            if (next === null || next.pos === current.pos) break; // zero-width guard
            current = next;
            count++;
        }
        // Summarize the repetition: how many times the atom matched, and whether
        // that satisfied the quantifier's bounds (for the stepwise narration).
        const ok = count >= minimum;
        yield {
            node,
            pos: current.pos,
            caps: current.caps,
            kind: 'quantifier',
            matched: ok,
            count,
        };
        return ok ? current : null;
    }

    if (node instanceof PatternCapture) {
        const next = yield* matchNode(node.atom, graphemes, state, fold);
        if (next === null) return null;
        // Copy-on-write so a failed alternation branch's capture never leaks
        // into the alternative tried from the same start.
        const caps = new Map(next.caps);
        caps.set(node.name.getText(), {
            text: graphemes.slice(state.pos, next.pos).join(''),
            start: state.pos,
            end: next.pos,
        });
        return { pos: next.pos, caps };
    }

    if (node instanceof PatternComplement) {
        if (node.atom instanceof PatternLook) {
            // Negative lookaround: succeed (zero-width) iff the look fails.
            const result = yield* matchNode(node.atom, graphemes, state, fold);
            return result === null ? state : null;
        }
        if (state.pos >= graphemes.length) {
            yield atomBeat(node, state, false);
            return null;
        }
        const inner = yield* matchNode(
            node.atom,
            graphemes,
            { pos: state.pos, caps: new Map() },
            fold,
        );
        const ok = inner === null; // the complement matches iff the atom didn't
        yield atomBeat(node, state, ok, graphemes[state.pos]);
        return ok ? { pos: state.pos + 1, caps: state.caps } : null;
    }

    if (node instanceof PatternLook) {
        const behind = node.direction.getText() !== PATTERN_AHEAD_SYMBOL;
        if (!behind) {
            const result = yield* matchSeq(
                node.body,
                graphemes,
                { pos: state.pos, caps: new Map() },
                fold,
            );
            return result !== null ? state : null; // zero-width
        }
        // Lookbehind: scan back for a start whose match ends exactly here.
        for (let start = state.pos; start >= 0; start--) {
            const result = yield* matchSeq(
                node.body,
                graphemes,
                { pos: start, caps: new Map() },
                fold,
            );
            if (result !== null && result.pos === state.pos) return state;
        }
        return null;
    }

    if (node instanceof PatternCaseFold)
        return yield* matchSeq(
            node.body,
            graphemes,
            state,
            node.language?.getTagString() ?? '',
        );

    if (node instanceof PatternWord) {
        // A word-like segment must START at this position; advance over it.
        const end = getWordInfo(graphemes, languageOf(node)).wordStarts.get(
            state.pos,
        );
        yield atomBeat(
            node,
            state,
            end !== undefined,
            end !== undefined
                ? graphemes.slice(state.pos, end).join('')
                : undefined,
        );
        return end === undefined ? null : { pos: end, caps: state.caps };
    }

    if (node instanceof PatternWordEdge) {
        // Zero-width: succeed iff this position is a segmenter boundary.
        const ok = getWordInfo(graphemes, languageOf(node)).boundaries.has(
            state.pos,
        );
        yield atomBeat(node, state, ok);
        return ok ? state : null;
    }

    yield atomBeat(node, state, false, graphemes[state.pos]);
    return null;
}

/** The BCP-47 tag on a word/word-edge atom (e.g. "en", "zh-Hant"). */
function languageOf(node: PatternWord | PatternWordEdge): string {
    return node.language.getTagString() ?? '';
}

/** The longer of two results (greater pos), keeping the earlier on a tie. */
function longer(a: State | null, b: State | null): State | null {
    if (a === null) return b;
    if (b === null) return a;
    return b.pos > a.pos ? b : a;
}

/**
 * Match a sequence's parts left-to-right with no precedence (LANGUAGE.md):
 * `a b | c d` is `(((a·b)|c)·d)`. Items are nodes; `|` separators are Tokens.
 *
 * Alternation is **longest-match**, not first-match: both operands of a `|` are
 * rooted at the sequence start, and we keep whichever consumes more — so `|` is
 * order-independent (`"cat" | "cats"` ≡ `"cats" | "cats"`) and consistent with
 * the rest of the language's "match as much as you can" rule. It is still
 * possessive: the longest local branch is chosen with no backtracking, so a
 * shorter branch that would have left room for what follows is not reconsidered.
 */
function* matchSeq(
    node: PatternSequence,
    graphemes: string[],
    state: State,
    fold: Fold,
): Matcher {
    const parts = node.parts;
    if (parts.length === 0) return state;
    let current = yield* matchNode(
        parts[0] as PatternNode,
        graphemes,
        state,
        fold,
    );
    let index = 1;
    while (index < parts.length) {
        const part = parts[index];
        if (!(part instanceof PatternNode)) {
            // `|`: try the right operand from the start too and keep the longer
            // of (left chain so far, right operand). Both are rooted at `state`.
            const right = parts[index + 1] as PatternNode;
            const rightResult = yield* matchNode(right, graphemes, state, fold);
            current = longer(current, rightResult);
            index += 2;
        } else {
            // Concatenation: continue from the left's end, or stay failed.
            current =
                current === null
                    ? null
                    : yield* matchNode(part, graphemes, current, fold);
            index += 1;
        }
    }
    return current;
}

function* matchWhole(
    pattern: PatternLiteral,
    graphemes: string[],
): Generator<MatchSnapshot, boolean, void> {
    const final = pattern.body
        ? yield* matchSeq(
              pattern.body,
              graphemes,
              { pos: 0, caps: new Map() },
              false,
          )
        : { pos: 0, caps: new Map() };
    return final !== null && final.pos === graphemes.length;
}

function* matchSearch(
    pattern: PatternLiteral,
    graphemes: string[],
): Generator<MatchSnapshot, PatternMatch[], void> {
    const results: PatternMatch[] = [];
    let start = 0;
    while (start <= graphemes.length) {
        // Announce the scan position so the narration can say "looking from here"
        // before the body's atoms are tried (LANGUAGE.md observable requirement).
        if (pattern.body)
            yield {
                node: pattern.body,
                pos: start,
                caps: new Map(),
                kind: 'scan',
            };
        const result = pattern.body
            ? yield* matchSeq(
                  pattern.body,
                  graphemes,
                  { pos: start, caps: new Map() },
                  false,
              )
            : { pos: start, caps: new Map() };
        if (result !== null && result.pos > start) {
            results.push({
                start,
                end: result.pos,
                text: graphemes.slice(start, result.pos).join(''),
                caps: result.caps,
            });
            start = result.pos;
        } else start += 1;
    }
    return results;
}

/** The stepwise generators (driven by the Evaluator in TextBasis `≈`/`⌕`). */
export function testGenerator(pattern: PatternLiteral, text: string) {
    return matchWhole(pattern, graphemesOf(text));
}
export function searchGenerator(pattern: PatternLiteral, text: string) {
    return matchSearch(pattern, graphemesOf(text));
}

/** Synchronous driver — runs the generator to completion (`≈`, and tests). */
export function testPattern(pattern: PatternLiteral, text: string): boolean {
    const generator = testGenerator(pattern, text);
    let step = generator.next();
    while (!step.done) step = generator.next();
    return step.value;
}

/** Synchronous driver — runs the generator to completion (`⌕`, and tests). */
export function searchPattern(
    pattern: PatternLiteral,
    text: string,
): PatternMatch[] {
    const generator = searchGenerator(pattern, text);
    let step = generator.next();
    while (!step.done) step = generator.next();
    return step.value;
}
