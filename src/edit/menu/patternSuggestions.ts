import type Node from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import PatternAtom from '@nodes/PatternAtom';
import PatternClass from '@nodes/PatternClass';
import PatternLiteralText from '@nodes/PatternLiteralText';
import PatternQuantified from '@nodes/PatternQuantified';
import PatternQuantifier from '@nodes/PatternQuantifier';
import PatternCapture from '@nodes/PatternCapture';
import PatternComplement from '@nodes/PatternComplement';
import PatternGroup from '@nodes/PatternGroup';
import PatternSet from '@nodes/PatternSet';
import PatternAnchor from '@nodes/PatternAnchor';
import PatternLook from '@nodes/PatternLook';
import PatternWord from '@nodes/PatternWord';
import PatternWordEdge from '@nodes/PatternWordEdge';
import PatternRest from '@nodes/PatternRest';
import PatternBackref from '@nodes/PatternBackref';
import PatternCaseFold from '@nodes/PatternCaseFold';
import PatternProperty from '@nodes/PatternProperty';
import PatternRange from '@nodes/PatternRange';
import PatternSequence from '@nodes/PatternSequence';
import PatternLiteral from '@nodes/PatternLiteral';
import Language from '@nodes/Language';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import {
    BIND_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    LANGUAGE_SYMBOL,
    MEASUREMENT_SYMBOL,
    NOT_SYMBOL,
    PATTERN_AHEAD_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_FOLD_SYMBOL,
    PATTERN_LETTER_SYMBOL,
    PATTERN_RANGE_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_REST_SYMBOL,
    PATTERN_SPACE_SYMBOL,
    PATTERN_START_SYMBOL,
    PATTERN_WORDEDGE_SYMBOL,
    PATTERN_WORD_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
} from '@parser/Symbols';

/**
 * Default-construction of every pattern construct for autocomplete (LANGUAGE.md).
 * The grammar refers to pattern atoms by the abstract {@link PatternNode} kind
 * (and to a few specific kinds in sets/quantifiers), but pattern nodes aren't in
 * the editor's generic `PossibleNodes` list, so without this a caret inside `⣿ ⣿`
 * — or after a quantifier with no atom — suggests nothing. Each builder makes a
 * minimal, parseable default the creator can then refine, so the whole regular-
 * expression grammar is reachable from the menu alone.
 */

// Tokens reused across builders.
const open = () => new Token(EVAL_OPEN_SYMBOL, Sym.EvalOpen);
const close = () => new Token(EVAL_CLOSE_SYMBOL, Sym.EvalClose);
/** The default-language tag for word/word-edge atoms; the creator can retag it. */
const defaultLanguage = (action: InsertContext | ReplaceContext) =>
    Language.make(action.locales.getLocales()[0]?.language ?? 'en');

/** A bare any-grapheme class `◌` — the default atom inside the compound nodes. */
function anyClass(): PatternClass {
    return new PatternClass(new Token(PATTERN_ANY_SYMBOL, Sym.PatternAny));
}

/** The four character-class atoms `◌ _ # ␣` (any, letter, digit, space). */
function characterClasses(): PatternClass[] {
    return [
        anyClass(),
        new PatternClass(new Token(PATTERN_LETTER_SYMBOL, Sym.PatternLetter)),
        new PatternClass(new Token(MEASUREMENT_SYMBOL, Sym.PatternDigit)),
        new PatternClass(new Token(PATTERN_SPACE_SYMBOL, Sym.PatternSpace)),
    ];
}

/** The quantity forms a creator can pick from: an exact count, a range, and the
 *  inequalities — `3`, `3–5`, `>0` (one+), `≥0` (zero+), `<3`, `≤1` (optional).
 *  Offered both as `‹quantity› ◌` atoms (to insert) and as the alternatives when
 *  a quantifier is selected, so every quantity is reachable from the menu. */
function quantifierForms(): PatternQuantifier[] {
    const count = (n: string) => new Token(n, Sym.Number);
    const relation = (glyph: string, sym: (typeof Sym)[keyof typeof Sym]) =>
        new Token(glyph, sym);
    return [
        new PatternQuantifier(undefined, count('3'), undefined, undefined),
        new PatternQuantifier(
            undefined,
            count('3'),
            new Token(PATTERN_RANGE_SYMBOL, Sym.PatternRange),
            count('5'),
        ),
        new PatternQuantifier(
            relation('>', Sym.PatternGreater),
            count('0'),
            undefined,
            undefined,
        ),
        new PatternQuantifier(
            relation('≥', Sym.PatternGreaterEqual),
            count('0'),
            undefined,
            undefined,
        ),
        new PatternQuantifier(
            relation('<', Sym.PatternLess),
            count('3'),
            undefined,
            undefined,
        ),
        new PatternQuantifier(
            relation('≤', Sym.PatternLessEqual),
            count('1'),
            undefined,
            undefined,
        ),
    ];
}

/** A sequence holding a single default atom, for container bodies. */
function bodyOfOne(): PatternSequence {
    return new PatternSequence([anyClass()]);
}

/** The atom subset — exactly what `parsePatternAtom` accepts (a class, literal,
 *  set, group, word/word-edge, lookaround, case-fold, rest, or backref). These
 *  are the only nodes valid in an atom-only slot (a capture's, complement's, or
 *  quantifier's atom); offering a capture/quantified/complement there would
 *  produce an unparseable tree. Excludes anchors (position-sensitive — see
 *  {@link anchorDefaults}). */
function pureAtoms(action: InsertContext | ReplaceContext): PatternNode[] {
    return [
        ...characterClasses(),
        new PatternLiteralText(new Token('""', Sym.PatternText)),
        new PatternGroup(open(), bodyOfOne(), close()),
        new PatternSet(
            new Token(SET_OPEN_SYMBOL, Sym.SetOpen),
            [anyClass()],
            new Token(SET_CLOSE_SYMBOL, Sym.SetClose),
        ),
        new PatternLook(
            new Token(PATTERN_AHEAD_SYMBOL, Sym.PatternAhead),
            open(),
            bodyOfOne(),
            close(),
        ),
        new PatternWord(
            new Token(PATTERN_WORD_SYMBOL, Sym.PatternWord),
            defaultLanguage(action),
        ),
        new PatternWordEdge(
            new Token(PATTERN_WORDEDGE_SYMBOL, Sym.PatternWordEdge),
            defaultLanguage(action),
        ),
        new PatternRest(new Token(PATTERN_REST_SYMBOL, Sym.PatternRest)),
        new PatternCaseFold(
            new Token(PATTERN_FOLD_SYMBOL, Sym.PatternFold),
            undefined,
            open(),
            bodyOfOne(),
            close(),
        ),
        // A backreference to each capture already named in this pattern (a bare
        // name). None offered when there are no captures — a bare unknown name
        // would just be an undefined backreference.
        ...captureBackrefs(action),
    ];
}

/** A single complemented atom (`~◌`), valid wherever a quantifier's atom or a
 *  sequence member is. */
function complementDefault(): PatternComplement {
    return new PatternComplement(
        new Token(NOT_SYMBOL, Sym.PatternComplement),
        anyClass(),
    );
}

/** Everything valid as a member of a sequence (`parsePatternItem`): the atoms
 *  plus the prefixed items — quantified atoms (one per quantity form), a named
 *  capture, and a complement. */
function sequenceItems(action: InsertContext | ReplaceContext): PatternNode[] {
    return [
        ...pureAtoms(action),
        // Each quantity form applied to a placeholder atom, so a count, range,
        // or inequality is directly insertable (refine the inner atom after).
        ...quantifierForms().map((q) => new PatternQuantified(q, anyClass())),
        new PatternCapture(
            new Token('name', Sym.Name),
            new Token(BIND_SYMBOL, Sym.Bind),
            new PatternGroup(open(), bodyOfOne(), close()),
        ),
        complementDefault(),
    ];
}

/** A backreference for each capture named in the enclosing pattern. */
function captureBackrefs(action: InsertContext | ReplaceContext): PatternNode[] {
    const anchor = 'node' in action ? action.node : action.parent;
    const pattern = action.context
        .getRoot(anchor)
        ?.getSelfAndAncestors(anchor)
        .find((n): n is PatternLiteral => n instanceof PatternLiteral);
    if (pattern === undefined) return [];
    const names = new Set<string>();
    for (const capture of pattern.nodes(
        (n): n is PatternCapture => n instanceof PatternCapture,
    )) {
        const name = capture.name.getText();
        if (name.length > 0) names.add(name);
    }
    return [...names].map(
        (name) => new PatternBackref(new Token(name, Sym.Name)),
    );
}

/** Anchors `⊢`/`⊣` are zero-width and only match at the very start/end of the
 *  text, so a start anchor mid-sequence (or after an atom) never matches. Offer
 *  `⊢` only when inserting at the start of a sequence's items, `⊣` only at the
 *  end — and never as a quantified atom, set member, or replacement. */
function anchorDefaults(action: InsertContext | ReplaceContext): PatternNode[] {
    if (
        !('field' in action) ||
        action.field !== 'parts' ||
        !(action.parent instanceof PatternSequence)
    )
        return [];
    const count = action.parent.parts.length;
    const anchors: PatternNode[] = [];
    if (action.index === 0)
        anchors.push(
            new PatternAnchor(new Token(PATTERN_START_SYMBOL, Sym.PatternStart)),
        );
    if (action.index === undefined || action.index >= count)
        anchors.push(
            new PatternAnchor(new Token(PATTERN_END_SYMBOL, Sym.PatternEnd)),
        );
    return anchors;
}

/** Pattern nodes valid only in a specific slot (set member, the quantifier of a
 *  quantified atom, the property of a class, a range in a set). Keyed off the
 *  requested kind, not offered for the generic atom kind. */
function slotDefaults(action: InsertContext | ReplaceContext): PatternNode[] {
    return [
        ...quantifierForms(),
        new PatternProperty(
            new Token(LANGUAGE_SYMBOL, Sym.Language),
            new Token('letter', Sym.Name),
            undefined,
            undefined,
        ),
        new PatternRange(
            new Token('"a"', Sym.PatternText),
            new Token(PATTERN_RANGE_SYMBOL, Sym.PatternRange),
            new Token('"z"', Sym.PatternText),
        ),
    ];
}

/**
 * Default pattern nodes that satisfy the requested grammar `kind`, respecting
 * what the parser actually accepts in each slot:
 *  - {@link PatternNode} (a sequence member) → every item + edge anchors;
 *  - {@link PatternAtom} (a capture's/complement's/quantifier's atom) → only the
 *    atom subset, so the menu can't build an unparseable capture-in-capture;
 *  - {@link PatternSequence} (a container body) → each item wrapped in a
 *    sequence, so an empty `⣿ ⣿`/`( )` offers the whole palette directly;
 *  - a specific pattern class → that class's default(s).
 * Returns `[]` for non-pattern kinds so the caller falls back to its generic
 * suggestions.
 */
export function getPatternSuggestions(
    kind: Function,
    action: InsertContext | ReplaceContext,
): Node[] {
    if (kind === PatternAtom) return pureAtoms(action);
    if (kind === PatternNode)
        return [...sequenceItems(action), ...anchorDefaults(action)];
    if (kind === PatternSequence)
        return sequenceItems(action).map((item) => new PatternSequence([item]));
    if (!(kind.prototype instanceof PatternNode)) return [];
    return [...sequenceItems(action), ...slotDefaults(action)].filter(
        (n) => n instanceof kind,
    );
}

/** Whether a grammar kind is satisfied by pattern nodes (so the menu should use
 *  {@link getPatternSuggestions} instead of the generic `PossibleNodes`). */
export function isPatternKind(kind: Function): boolean {
    return kind === PatternNode || kind.prototype instanceof PatternNode;
}
