import type Node from '@nodes/Node';
import PatternAnchor from '@nodes/PatternAnchor';
import PatternBackref from '@nodes/PatternBackref';
import PatternCapture from '@nodes/PatternCapture';
import PatternCaseFold from '@nodes/PatternCaseFold';
import PatternClass from '@nodes/PatternClass';
import PatternComplement from '@nodes/PatternComplement';
import PatternGroup from '@nodes/PatternGroup';
import PatternLiteral from '@nodes/PatternLiteral';
import PatternLiteralText from '@nodes/PatternLiteralText';
import PatternLook from '@nodes/PatternLook';
import type PatternNode from '@nodes/PatternNode';
import PatternProperty from '@nodes/PatternProperty';
import PatternQuantified from '@nodes/PatternQuantified';
import PatternQuantifier from '@nodes/PatternQuantifier';
import PatternRange from '@nodes/PatternRange';
import PatternRest from '@nodes/PatternRest';
import PatternSequence from '@nodes/PatternSequence';
import PatternSet from '@nodes/PatternSet';
import PatternWord from '@nodes/PatternWord';
import PatternWordEdge from '@nodes/PatternWordEdge';
import Language from '@nodes/Language';
import { Sym, type SymType } from '@nodes/Sym';
import Token from '@nodes/Token';
import parseLanguage from '@parser/parseLanguage';
import type Tokens from '@parser/Tokens';

/**
 * Parser for the pattern sublanguage `⣿ … ⣿` (Wordplay's regular-expression
 * replacement). Kept out of the (already large) parseExpression.ts; only the
 * top-level {@link parsePattern} is exported, dispatched from
 * parseAtomicExpression on a leading `⣿`. See LANGUAGE.md for the grammar.
 */

const PatternClassBases = [
    Sym.PatternAny,
    Sym.PatternLetter,
    Sym.PatternDigit,
    Sym.PatternSpace,
];

const PatternQuantifierStarts = [
    Sym.Number,
    Sym.PatternEqual,
    Sym.PatternGreater,
    Sym.PatternGreaterEqual,
    Sym.PatternLess,
    Sym.PatternLessEqual,
];

const PatternAtomStarts = [
    ...PatternClassBases,
    Sym.PatternText,
    Sym.SetOpen,
    Sym.EvalOpen,
    Sym.PatternStart,
    Sym.PatternEnd,
    Sym.PatternWord,
    Sym.PatternWordEdge,
    Sym.PatternAhead,
    Sym.PatternBehind,
    Sym.PatternFold,
    Sym.PatternRest,
    Sym.Name,
];

/**
 * Read the expected token, or an empty non-consuming placeholder when it's
 * absent, so the parser stays total on incomplete input (the editor reparses on
 * every keystroke). A missing required token is surfaced downstream as a
 * conflict, not a thrown error, and the delimiter that follows is left intact.
 */
function readOr(tokens: Tokens, type: SymType): Token {
    return tokens.nextIs(type) ? tokens.read(type) : new Token('', type);
}

/** Tokens that can begin a pattern item (an atom, a quantifier, or `~`). */
function nextIsPatternItem(tokens: Tokens): boolean {
    return (
        tokens.nextIsOneOf(...PatternAtomStarts) ||
        tokens.nextIsOneOf(...PatternQuantifierStarts) ||
        tokens.nextIs(Sym.PatternComplement)
    );
}

/** Parse a pattern literal `⣿ … ⣿`. See LANGUAGE.md. */
export default function parsePattern(tokens: Tokens): PatternLiteral {
    const open = tokens.read(Sym.PatternDelimiter);
    const body = nextIsPatternItem(tokens)
        ? parsePatternSequence(tokens)
        : undefined;
    const close = tokens.readIf(Sym.PatternDelimiter);
    return new PatternLiteral(open, body, close);
}

/** Parse a sequence of items with optional left-to-right alternation. */
function parsePatternSequence(tokens: Tokens): PatternSequence {
    const parts: Node[] = [parsePatternItem(tokens)];
    tokens.whileDo(
        () =>
            tokens.hasNext() &&
            (tokens.nextIs(Sym.PatternAlternation) ||
                nextIsPatternItem(tokens)),
        () => {
            if (tokens.nextIs(Sym.PatternAlternation))
                parts.push(tokens.read(Sym.PatternAlternation));
            else parts.push(parsePatternItem(tokens));
        },
    );
    return new PatternSequence(parts);
}

/** Parse one item: an optional prefix (capture/quantifier/complement) + one atom. */
function parsePatternItem(tokens: Tokens): PatternNode {
    // A name immediately followed by `:` is a capture.
    if (tokens.nextAre(Sym.Name, Sym.Bind)) {
        const name = tokens.read(Sym.Name);
        const bind = tokens.read(Sym.Bind);
        return new PatternCapture(name, bind, parsePatternAtom(tokens));
    }
    // `~` is a complement.
    if (tokens.nextIs(Sym.PatternComplement))
        return parsePatternComplement(tokens);
    // A count/inequality is a quantifier applied to one atom, which may itself
    // be a complement (e.g. `2 ~#` = two non-digits).
    if (tokens.nextIsOneOf(...PatternQuantifierStarts)) {
        return new PatternQuantified(
            parsePatternQuantifier(tokens),
            tokens.nextIs(Sym.PatternComplement)
                ? parsePatternComplement(tokens)
                : parsePatternAtom(tokens),
        );
    }
    return parsePatternAtom(tokens);
}

function parsePatternComplement(tokens: Tokens): PatternComplement {
    const not = tokens.read(Sym.PatternComplement);
    return new PatternComplement(not, parsePatternAtom(tokens));
}

function parsePatternQuantifier(tokens: Tokens): PatternQuantifier {
    const relation = tokens.nextIsOneOf(
        Sym.PatternEqual,
        Sym.PatternGreater,
        Sym.PatternGreaterEqual,
        Sym.PatternLess,
        Sym.PatternLessEqual,
    )
        ? tokens.read()
        : undefined;
    const low = readOr(tokens, Sym.Number);
    const dash = tokens.readIf(Sym.PatternRange);
    const high = dash ? readOr(tokens, Sym.Number) : undefined;
    return new PatternQuantifier(relation, low, dash, high);
}

function parsePatternAtom(tokens: Tokens): PatternNode {
    // Character class with optional /property.
    if (tokens.nextIsOneOf(...PatternClassBases)) {
        const base = tokens.read();
        const property = tokens.nextIs(Sym.Language)
            ? parsePatternProperty(tokens)
            : undefined;
        return new PatternClass(base, property);
    }
    // Raw literal text (a whole quoted span tokenized as one PatternText).
    if (tokens.nextIs(Sym.PatternText))
        return new PatternLiteralText(tokens.read(Sym.PatternText));
    // Glyph set.
    if (tokens.nextIs(Sym.SetOpen)) return parsePatternSet(tokens);
    // Group.
    if (tokens.nextIs(Sym.EvalOpen)) return parsePatternGroup(tokens);
    // Anchors.
    if (tokens.nextIsOneOf(Sym.PatternStart, Sym.PatternEnd))
        return new PatternAnchor(tokens.read());
    // Word and word-edge (locale-tagged). The locale is required, but parse it
    // only when a `/` follows so an incomplete `⣿▭⣿` yields a missing-locale
    // conflict rather than throwing.
    if (tokens.nextIs(Sym.PatternWord))
        return new PatternWord(tokens.read(), readLanguageOr(tokens));
    if (tokens.nextIs(Sym.PatternWordEdge))
        return new PatternWordEdge(tokens.read(), readLanguageOr(tokens));
    // Lookaround.
    if (tokens.nextIsOneOf(Sym.PatternAhead, Sym.PatternBehind))
        return parsePatternLook(tokens);
    // Case fold.
    if (tokens.nextIs(Sym.PatternFold)) return parsePatternCaseFold(tokens);
    // Rest.
    if (tokens.nextIs(Sym.PatternRest))
        return new PatternRest(tokens.read(Sym.PatternRest));
    // A bare name is a backreference. Only consume a Name; otherwise leave a
    // placeholder so a dangling delimiter (`⣿`) or the End token is not eaten.
    return new PatternBackref(readOr(tokens, Sym.Name));
}

/** A `/lang` tag, or an empty placeholder Language when no `/` follows. */
function readLanguageOr(tokens: Tokens): Language {
    return tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : new Language(new Token('', Sym.Language));
}

function parsePatternProperty(tokens: Tokens): PatternProperty {
    const slash = tokens.read(Sym.Language);
    const name = readOr(tokens, Sym.Name);
    const equal = tokens.readIf(Sym.PatternEqual);
    const value = equal ? readOr(tokens, Sym.Name) : undefined;
    return new PatternProperty(slash, name, equal, value);
}

function parsePatternGroup(tokens: Tokens): PatternGroup {
    const open = tokens.read(Sym.EvalOpen);
    const body = parsePatternSequence(tokens);
    const close = tokens.readIf(Sym.EvalClose);
    return new PatternGroup(open, body, close);
}

function parsePatternLook(tokens: Tokens): PatternLook {
    const direction = tokens.read();
    const open = tokens.read(Sym.EvalOpen);
    const body = parsePatternSequence(tokens);
    const close = tokens.readIf(Sym.EvalClose);
    return new PatternLook(direction, open, body, close);
}

function parsePatternCaseFold(tokens: Tokens): PatternCaseFold {
    const fold = tokens.read(Sym.PatternFold);
    const language = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    const open = tokens.read(Sym.EvalOpen);
    const body = parsePatternSequence(tokens);
    const close = tokens.readIf(Sym.EvalClose);
    return new PatternCaseFold(fold, language, open, body, close);
}

function parsePatternSet(tokens: Tokens): PatternSet {
    const open = tokens.read(Sym.SetOpen);
    const members: Node[] = [];
    tokens.whileDo(
        () =>
            tokens.hasNext() &&
            tokens.nextIsnt(Sym.SetClose) &&
            tokens.nextIsOneOf(...PatternClassBases, Sym.PatternText, Sym.Name),
        () => members.push(parsePatternSetMember(tokens)),
    );
    const close = tokens.readIf(Sym.SetClose);
    return new PatternSet(open, members, close);
}

function parsePatternSetMember(tokens: Tokens): PatternNode {
    if (tokens.nextIsOneOf(...PatternClassBases)) {
        const base = tokens.read();
        const property = tokens.nextIs(Sym.Language)
            ? parsePatternProperty(tokens)
            : undefined;
        return new PatternClass(base, property);
    }
    // A bare name is a named class (e.g. `linebreak`); resolved in a later phase.
    if (tokens.nextIs(Sym.Name))
        return new PatternBackref(tokens.read(Sym.Name));
    // A raw text literal, possibly the low end of a range `"a"–"z"`.
    const low = readOr(tokens, Sym.PatternText);
    if (tokens.nextIs(Sym.PatternRange)) {
        const dash = tokens.read(Sym.PatternRange);
        const high = readOr(tokens, Sym.PatternText);
        return new PatternRange(low, dash, high);
    }
    return new PatternLiteralText(low);
}
