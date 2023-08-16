import { tokenize } from './Tokenizer';
import { DOCS_SYMBOL, EXPONENT_SYMBOL, PRODUCT_SYMBOL } from './Symbols';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import Program from '@nodes/Program';
import Borrow from '@nodes/Borrow';
import Block, { BlockKind } from '@nodes/Block';
import ListLiteral from '@nodes/ListLiteral';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import PropertyReference from '@nodes/PropertyReference';
import FunctionDefinition from '@nodes/FunctionDefinition';
import UnionType from '@nodes/UnionType';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import TextLiteral from '@nodes/TextLiteral';
import NameType from '@nodes/NameType';
import NoneType from '@nodes/NoneType';
import TextType from '@nodes/TextType';
import ListType from '@nodes/ListType';
import FunctionType from '@nodes/FunctionType';
import KeyValue from '@nodes/KeyValue';
import ListAccess from '@nodes/ListAccess';
import Conditional from '@nodes/Conditional';
import StructureDefinition from '@nodes/StructureDefinition';
import Name from '@nodes/Name';
import Doc from '@nodes/Doc';
import Row from '@nodes/Row';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import Select from '@nodes/Select';
import Insert from '@nodes/Insert';
import Update from '@nodes/Update';
import Delete from '@nodes/Delete';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Reaction from '@nodes/Reaction';
import StreamType from '@nodes/StreamType';
import BooleanType from '@nodes/BooleanType';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import Reference from '@nodes/Reference';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Convert from '@nodes/Convert';
import Unit from '@nodes/Unit';
import Language from '@nodes/Language';
import Is from '@nodes/Is';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Previous from '@nodes/Previous';
import MapLiteral from '@nodes/MapLiteral';
import SetLiteral from '@nodes/SetLiteral';
import MapType from '@nodes/MapType';
import SetType from '@nodes/SetType';
import TypeInputs from '@nodes/TypeInputs';
import This from '@nodes/This';
import ConversionType from '@nodes/ConversionType';
import Dimension from '@nodes/Dimension';
import Docs from '@nodes/Docs';
import Names from '@nodes/Names';
import UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import type Spaces from './Spaces';
import DocumentedExpression from '@nodes/DocumentedExpression';
import TypeVariables from '@nodes/TypeVariables';
import TypeVariable from '@nodes/TypeVariable';
import Changed from '@nodes/Changed';
import Paragraph, { type Segment } from '@nodes/Paragraph';
import WebLink from '@nodes/WebLink';
import ConceptLink from '@nodes/ConceptLink';
import Words from '@nodes/Words';
import Example from '@nodes/Example';
import PropertyBind from '../nodes/PropertyBind';
import Initial from '../nodes/Initial';
import Markup from '../nodes/Markup';
import Mention from '../nodes/Mention';
import Branch from '../nodes/Branch';
import FormattedType from '../nodes/FormattedType';
import Translation, { type TranslationSegment } from '../nodes/Translation';
import FormattedTranslation from '../nodes/FormattedTranslation';
import FormattedLiteral from '../nodes/FormattedLiteral';
import IsLocale from '../nodes/IsLocale';

export enum SyntacticConflict {
    EXPECTED_BORRW_NAME,
    EXPECTED_BIND_NAME,
    EXPECTED_BIND,
    EXPECTED_STRUCTURE_NAME,
    EXPECTED_ACCESS_NAME,
    EXPECTED_TYPE_VAR_NAME,
    EXPECTED_EVAL_OPEN,
    EXPECTED_EVAL_CLOSE,
    EXPECTED_LIST_OPEN,
    EXPECTED_LIST_CLOSE,
    EXPECTED_SET_OPEN,
    EXPECTED_SET_CLOSE,
    EXPECTED_TEXT_OPEN,
    EXPECTED_TEXT_CLOSE,
    EXPECTED_TABLE_CLOSE,
    EXPECTED_EXPRESSION,
    EXPECTED_LANGUAGE,
    EXPECTED_CONVERT,
    EXPECTED_UNIT_NAME,
    EXPECTED_END,
    EXPECTED_TYPE,
    EXPECTED_FUNCTION,
    BIND_VALUE_NOT_ALLOWED,
}

export class Tokens {
    /** The tokens that have yet to be read. */
    readonly #unread: Token[];

    /** The tokens that have been read. */
    readonly #read: Token[] = [];

    /** The preceding space for each token */
    readonly #spaces;

    constructor(tokens: Token[], spaces: Spaces) {
        this.#unread = tokens.slice();
        this.#spaces = spaces;
    }

    /** Returns the text of the next token */
    peek(): Token | undefined {
        return this.hasNext() ? this.#unread[0] : undefined;
    }

    /** Returns the text of the next token */
    peekText(): string | undefined {
        return this.hasNext() ? this.#unread[0].text.toString() : undefined;
    }

    /** Get the space of the next token */
    peekSpace(): string | undefined {
        return this.hasNext()
            ? this.#spaces.getSpace(this.#unread[0])
            : undefined;
    }

    getSpaces() {
        return this.#spaces;
    }

    peekUnread() {
        return this.#unread;
    }

    /** Returns true if the token list isn't empty. */
    hasNext(): boolean {
        return this.#unread.length > 0 && !this.#unread[0].isSymbol(Sym.End);
    }

    nextIsEnd(): boolean {
        return this.#unread.length > 0 && this.#unread[0].isSymbol(Sym.End);
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: Sym, text?: string): boolean {
        return (
            this.hasNext() &&
            this.peek()?.isSymbol(type) === true &&
            (text === undefined || this.peekText() === text)
        );
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: Sym): boolean {
        return this.hasNext() && this.peek()?.isntSymbol(type) === true;
    }

    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: Sym[]) {
        return types.every(
            (type, index) =>
                index < this.#unread.length &&
                this.#unread[index].isSymbol(type)
        );
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: Sym): boolean {
        return (
            this.#read.length > 0 &&
            this.#read[this.#read.length - 1].isSymbol(type)
        );
    }

    beforeNextLineIs(type: Sym) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        while (index < this.#unread.length) {
            const token = this.#unread[index];
            if (index > 0 && this.#spaces.hasLineBreak(this.#unread[index]))
                break;
            if (token.isSymbol(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return (
            index < this.#unread.length && this.#unread[index].isSymbol(type)
        );
    }

    nextIsOneOf(...types: Sym[]): boolean {
        return types.find((type) => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextLacksPrecedingSpace(): boolean {
        return this.hasNext() && !this.#spaces.hasSpace(this.#unread[0]);
    }

    /** Returns true if and only if the next token is the specified type. */
    afterLacksPrecedingSpace(): boolean {
        const after = this.#unread[1];
        return (
            after !== undefined &&
            !after.isSymbol(Sym.End) &&
            !this.#spaces.hasSpace(after)
        );
    }

    hasAfter(): boolean {
        const after = this.#unread[1];
        return (
            after !== undefined &&
            !after.isSymbol(Sym.End) &&
            !after.isSymbol(Sym.Code)
        );
    }

    nextIsUnary(): boolean {
        return (
            this.nextIs(Sym.Operator) &&
            this.hasAfter() &&
            this.afterLacksPrecedingSpace()
        );
    }

    /** Returns true if and only if the next token has a preceding line break. */
    nextHasPrecedingLineBreak(): boolean | undefined {
        return !this.hasNext()
            ? undefined
            : this.#spaces.hasLineBreak(this.#unread[0]);
    }

    /** Returns true if there's a space ahead with more than one line break */
    nextHasMoreThanOneLineBreak(): boolean {
        return (this.peekSpace() ?? '').split('\n').length - 1 >= 2;
    }

    /** Returns a token list without the first token. */
    read(expectedType?: Sym): Token {
        const next = this.#unread.shift();
        if (next !== undefined) {
            if (expectedType !== undefined && !next.isSymbol(expectedType)) {
                throw new Error(
                    `Internal parsing error at ${this.#read
                        .slice(this.#read.length - 10, this.#read.length)
                        .map((t) => t.toWordplay())
                        .join('')} *** ${this.#unread
                        .slice(0, 10)
                        .map((t) => t.toWordplay())
                        .join('')}; expected ${expectedType}, received ${
                        next.types
                    }`
                );
            }
            this.#read.push(next);
            return next;
        } else return new Token('', Sym.End);
    }

    readIf(type: Sym) {
        return this.nextIs(type) ? this.read() : undefined;
    }

    /** Used to read the remainder of a line, and at least one token, unless there are no more tokens. */
    readLine() {
        const nodes: Node[] = [];
        if (!this.hasNext()) return nodes;
        // Read at least one token, then keep going until we reach a token with a line break.
        do {
            nodes.push(this.read());
        } while (
            this.hasNext() &&
            this.nextHasPrecedingLineBreak() === false &&
            this.nextIsnt(Sym.Code)
        );
        return nodes;
    }

    /** Rollback to the given token. */
    unreadTo(token: Token) {
        while (this.#read.length > 0 && this.#unread[0] !== token) {
            const unreadToken = this.#read.pop();
            if (unreadToken !== undefined) this.#unread.unshift(unreadToken);
        }
    }
}

export function toProgram(code: string): Program {
    return parseProgram(toTokens(code));
}

export function toTokens(code: string): Tokens {
    const tokens = tokenize(code);
    return new Tokens(tokens.getTokens(), tokens.getSpaces());
}

export function toMarkup(template: string): [Markup, Spaces] {
    const tokens = toTokens(DOCS_SYMBOL + template + DOCS_SYMBOL);
    return [parseDoc(tokens).markup, tokens.getSpaces()];
}

export function toExpression(code: string): Expression {
    return parseExpression(toTokens(code));
}

// PROGRAM :: BORROW* BLOCK
export function parseProgram(tokens: Tokens, doc = false): Program {
    // If a borrow is next or there's no whitespace, parse a docs.
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;

    const borrows = [];
    while (tokens.hasNext() && tokens.nextIs(Sym.Borrow))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(tokens, BlockKind.Root, doc);

    // If the next token is the end, we're done! Otherwise, read all of the remaining
    // tokens and bundle them into an unparsable.
    const end = tokens.nextIsEnd()
        ? tokens.read(Sym.End)
        : new Token('', Sym.End);

    return new Program(docs, borrows, block, end);
}

// BORROW :: ↓ name number?
export function parseBorrow(tokens: Tokens): Borrow {
    const borrow = tokens.read(Sym.Borrow);
    const source = tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const dot = tokens.readIf(Sym.Access);
    const name =
        dot && tokens.nextIs(Sym.Name) ? parseReference(tokens) : undefined;
    const version =
        tokens.nextIs(Sym.Number) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Number)
            : undefined;

    return new Borrow(borrow, source, dot, name, version);
}

/** BLOCK :: DOCS ? ( [BIND|EXPRESSION]+ )  */
export function parseBlock(
    tokens: Tokens,
    kind: BlockKind = BlockKind.Block,
    doc = false
): Block {
    const root = kind === BlockKind.Root;

    // Grab any documentation if this isn't a root.
    const docs = root
        ? undefined
        : tokens.nextIs(Sym.Doc)
        ? parseDocs(tokens)
        : undefined;

    const open = root
        ? undefined
        : tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;

    const statements = [];
    // Keep reading binds and expressions until
    // 1) there are no more tokens and one the following is true:
    //  a) It's a root and not a doc
    //  b) It's not a root or a doc and the next is an eval close
    //  c) It's a doc and the next is an example close
    while (
        tokens.hasNext() &&
        ((root && !doc) ||
            (!root && !doc && tokens.nextIsnt(Sym.EvalClose)) ||
            (doc && tokens.nextIsnt(Sym.Code)))
    )
        statements.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens, true)
        );

    const close = root
        ? undefined
        : tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;

    return new Block(statements, kind, open, close, docs);
}

function nextAreOptionalDocsThen(tokens: Tokens, types: Sym[]): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    // We don't actually care what the docs are or if there are any.
    if (tokens.nextIs(Sym.Doc)) parseDocs(tokens);

    // Is the next the type?
    let matches = true;
    while (types.length > 0) {
        const next = types.shift();
        if (next) matches = tokens.nextIs(next);
        if (matches === false) break;
        tokens.read();
    }

    // Rollback
    tokens.unreadTo(rollbackToken);

    // It's a bind if it has a name and a bind symbol.
    return matches;
}

function nextIsEvaluate(tokens: Tokens): boolean {
    if (!tokens.nextLacksPrecedingSpace()) return false;

    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    if (tokens.nextIs(Sym.TypeOpen)) parseTypeInputs(tokens);

    const nextIsEval = tokens.nextIs(Sym.EvalOpen);

    tokens.unreadTo(rollbackToken);

    return nextIsEval;
}

function nextIsBind(tokens: Tokens, expectValue: boolean): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;
    const bind = parseBind(tokens);
    if (tokens.peek() === rollbackToken) return false;

    // Rollback
    tokens.unreadTo(rollbackToken);

    // It's a bind if it has a name and either doesn't expect a value, or has one, or has a name with a language tag
    return (
        bind.names.names.length > 0 &&
        (!expectValue || bind.colon !== undefined || bind.names.hasLanguage())
    );
}

/** BIND :: NAMES TYPE? (: EXPRESSION)? */
export function parseBind(tokens: Tokens): Bind {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.readIf(Sym.Share);
    const names = parseNames(tokens);
    const etc = tokens.readIf(Sym.Etc);
    let colon;
    let value;
    let dot;
    let type;

    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        type = parseType(tokens);
    }

    if (tokens.nextIs(Sym.Bind)) {
        colon = tokens.read(Sym.Bind);
        value = tokens.hasNext() ? parseExpression(tokens) : undefined;
    }

    return new Bind(docs, share, names, etc, dot, type, colon, value);
}

/** NAMES :: (name LANGUAGE?)+ */
export function parseNames(tokens: Tokens): Names {
    const names: Name[] = [];

    while (
        (tokens.hasNext() &&
            names.length > 0 &&
            tokens.nextIs(Sym.Separator)) ||
        (names.length === 0 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder, Sym.Operator))
    ) {
        const comma = tokens.nextIs(Sym.Separator)
            ? tokens.read(Sym.Separator)
            : undefined;
        if (names.length > 0 && comma === undefined) break;
        const name = tokens.nextIs(Sym.Name)
            ? tokens.read(Sym.Name)
            : tokens.nextIs(Sym.Placeholder)
            ? tokens.read(Sym.Placeholder)
            : tokens.nextIs(Sym.Operator)
            ? tokens.read(Sym.Operator)
            : undefined;
        const lang = tokens.nextIs(Sym.Language)
            ? parseLanguage(tokens)
            : undefined;
        if (comma !== undefined || name !== undefined)
            names.push(new Name(comma, name, lang));
        else break;
    }

    return new Names(names);
}

/** LANGUAGE :: /NAME */
export function parseLanguage(tokens: Tokens): Language {
    const slash = tokens.read(Sym.Language);
    const lang =
        tokens.nextIs(Sym.Name) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(Sym.Name)
            : undefined;
    const dash =
        tokens.nextIs(Sym.Region) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Region)
            : undefined;
    const region =
        dash && tokens.nextIs(Sym.Name) && tokens.nextLacksPrecedingSpace()
            ? tokens.read(Sym.Name)
            : undefined;
    return new Language(slash, lang, dash, region);
}

/** EXPRESSION :: BINARY_OPERATION [ conditional EXPRESSION EXPRESSION ]? */
export function parseExpression(
    tokens: Tokens,
    expectSpace = false,
    allowReaction = true
): Expression {
    // If the next token has more than one preceding line break, just return an unparsable.
    // This prevents runaway expressions and provides an opportunity to provide feedback precisely
    // where the expression was expected.
    if (!expectSpace && tokens.nextHasMoreThanOneLineBreak())
        return new UnparsableExpression([]);

    let left = parseBinaryEvaluate(tokens);

    // Is it conditional statement?
    if (tokens.nextIs(Sym.Conditional)) left = parseConditional(left, tokens);

    // Is it a reaction?
    if (tokens.nextIs(Sym.Stream) && allowReaction)
        left = parseReaction(left, tokens);

    // Return whatever expression we got
    return left;
}

export function parseConditional(
    condition: Expression,
    tokens: Tokens
): Conditional {
    const question = tokens.read(Sym.Conditional);
    const yes = parseExpression(tokens);
    const no = parseExpression(tokens);
    return new Conditional(condition, question, yes, no);
}

/** BINARY_OPERATION :: ATOMIC_EXPRESSION [ binary_op ATOMIC_EXPRESSION ]* */
export function parseBinaryEvaluate(tokens: Tokens): Expression {
    let left = parseAtomicExpression(tokens);

    while (
        tokens.hasNext() &&
        !tokens.nextIsUnary() &&
        (tokens.nextIs(Sym.Operator) ||
            (tokens.nextIs(Sym.TypeOperator) &&
                !tokens.nextHasPrecedingLineBreak()))
    ) {
        left = tokens.nextIs(Sym.TypeOperator)
            ? new Is(left, tokens.read(Sym.TypeOperator), parseType(tokens))
            : new BinaryEvaluate(
                  left,
                  parseReference(tokens),
                  parseAtomicExpression(tokens)
              );
    }
    return left;
}

/**
 *
 * ATOMIC_EXPRESSION ::
 *   name |
 *   number |
 *   boolean |
 *   LIST |
 *   SET |
 *   MAP |
 *   TABLE |
 *   ACCESS |
 *   EVAL |
 *   BLOCK |
 *   TEMPLATE |
 *   FUNCTION |
 *   CONVERSION |
 *   STREAM |
 */
function parseAtomicExpression(tokens: Tokens): Expression {
    // All expressions must start with one of the following
    let left: Expression =
        // This
        tokens.nextIs(Sym.This)
            ? new This(tokens.read(Sym.This))
            : // Placeholder
            tokens.nextIs(Sym.Placeholder)
            ? parsePlaceholder(tokens)
            : // Start
            tokens.nextIs(Sym.Initial)
            ? parseInitial(tokens)
            : // Change
            tokens.nextIs(Sym.Change)
            ? parseChanged(tokens)
            : // Nones
            tokens.nextIs(Sym.None)
            ? parseNone(tokens)
            : // Unary expressions before names and binary operators, since some unary can be multiple.
            tokens.nextIsUnary()
            ? new UnaryEvaluate(
                  parseReference(tokens),
                  parseAtomicExpression(tokens)
              )
            : // References can be names or binary operators
            tokens.nextIsOneOf(Sym.Name, Sym.Operator)
            ? parseReference(tokens)
            : // Booleans
            tokens.nextIs(Sym.Boolean)
            ? new BooleanLiteral(tokens.read(Sym.Boolean))
            : // Numbers with units
            tokens.nextIs(Sym.Number)
            ? parseNumber(tokens)
            : // Text with optional formats
            tokens.nextIs(Sym.Text)
            ? parseText(tokens)
            : // A list
            tokens.nextIs(Sym.ListOpen)
            ? parseList(tokens)
            : // A set or map
            tokens.nextIs(Sym.SetOpen)
            ? parseSetOrMap(tokens)
            : // Table literals
            tokens.nextIs(Sym.TableOpen)
            ? parseTable(tokens)
            : // A block expression
            nextAreOptionalDocsThen(tokens, [Sym.EvalOpen])
            ? parseBlock(tokens, BlockKind.Block)
            : // A structure definition
            nextAreOptionalDocsThen(tokens, [Sym.Type]) ||
              nextAreOptionalDocsThen(tokens, [Sym.Share, Sym.Type])
            ? parseStructure(tokens)
            : // A function function
            nextAreOptionalDocsThen(tokens, [Sym.Function]) ||
              nextAreOptionalDocsThen(tokens, [Sym.Share, Sym.Function])
            ? parseFunction(tokens)
            : // A conversion function.
            nextAreOptionalDocsThen(tokens, [Sym.Convert])
            ? parseConversion(tokens)
            : tokens.nextIs(Sym.Previous)
            ? parsePrevious(tokens)
            : tokens.nextIs(Sym.Formatted)
            ? parseFormattedLiteral(tokens)
            : tokens.nextIs(Sym.Locale)
            ? parseIsLocale(tokens)
            : // A documented expression
            tokens.nextIs(Sym.Doc)
            ? parseDocumentedExpression(tokens)
            : // Unknown expression
              new UnparsableExpression(tokens.readLine());

    // But wait! Is it one or more infix expressions? Slurp them up.
    let match = false;
    do {
        match = true;
        if (tokens.nextIs(Sym.Access))
            left = parsePropertyReference(left, tokens);
        else if (
            tokens.nextIs(Sym.ListOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseListAccess(left, tokens);
        else if (tokens.nextIs(Sym.SetOpen) && tokens.nextLacksPrecedingSpace())
            left = parseSetOrMapAccess(left, tokens);
        else if (nextIsEvaluate(tokens)) left = parseEvaluate(left, tokens);
        else if (tokens.nextIs(Sym.Convert)) left = parseConvert(left, tokens);
        else if (tokens.nextIs(Sym.Select)) left = parseSelect(left, tokens);
        else if (tokens.nextIs(Sym.Insert)) left = parseInsert(left, tokens);
        else if (tokens.nextIs(Sym.Update)) left = parseUpdate(left, tokens);
        else if (tokens.nextIs(Sym.Delete)) left = parseDelete(left, tokens);
        else match = false;
    } while (match);
    return left;
}

function parsePlaceholder(tokens: Tokens): ExpressionPlaceholder {
    const placeholder = tokens.read(Sym.Placeholder);

    let dot;
    let type;
    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        type = parseType(tokens);
    }

    return new ExpressionPlaceholder(placeholder, dot, type);
}

function parseInitial(tokens: Tokens): Initial {
    const diamond = tokens.read(Sym.Initial);
    return new Initial(diamond);
}

function parseReference(tokens: Tokens): Reference {
    const name = tokens.read(
        tokens.nextIs(Sym.Operator) ? Sym.Operator : Sym.Name
    );

    return new Reference(name);
}

function parseChanged(tokens: Tokens): Changed {
    const change = tokens.read(Sym.Change);
    const stream = parseAtomicExpression(tokens);

    return new Changed(change, stream);
}

function parseIsLocale(tokens: Tokens): IsLocale {
    const locale = tokens.read(Sym.Locale);
    const language = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new IsLocale(locale, language);
}

function parseDocumentedExpression(tokens: Tokens): Expression {
    const docs = parseDocs(tokens);
    const expression = parseExpression(tokens);
    return new DocumentedExpression(docs, expression);
}

/** NONE :: ! ALIASES */
function parseNone(tokens: Tokens): NoneLiteral {
    const error = tokens.read(Sym.None);
    return new NoneLiteral(error);
}

/** NUMBER :: number name? */
export function parseNumber(tokens: Tokens): NumberLiteral {
    const number = tokens.read(Sym.Number);
    const unit =
        tokens.nextIsOneOf(Sym.Name, Sym.Language) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberLiteral(number, unit ?? Unit.Empty);
}

/** UNIT :: DIMENSION (·DIMENSION)* (/ DIMENSION (·DIMENSION*))? */
function parseUnit(tokens: Tokens): Unit | undefined {
    // Parse a wildcard unit.
    if (tokens.nextIs(Sym.Conditional)) {
        return new Unit(
            undefined,
            [
                new Dimension(
                    undefined,
                    tokens.read(Sym.Conditional),
                    undefined,
                    undefined
                ),
            ],
            undefined,
            []
        );
    }

    // A unit is just a series of names, carets, numbers, and product symbols not separated by spaces.
    const numerator: Dimension[] = [];

    while (
        (tokens.nextIs(Sym.Name) ||
            tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)) &&
        tokens.nextLacksPrecedingSpace()
    )
        numerator.push(parseDimension(tokens));

    let slash = undefined;
    const denominator: Dimension[] = [];
    if (tokens.nextIs(Sym.Language)) {
        slash = tokens.read(Sym.Language);
        while (
            (tokens.nextIs(Sym.Name) ||
                tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)) &&
            tokens.nextLacksPrecedingSpace()
        )
            denominator.push(parseDimension(tokens));
    }

    return numerator.length === 0 &&
        denominator.length === 0 &&
        slash === undefined
        ? undefined
        : new Unit(undefined, numerator, slash, denominator);
}

/** DIMENSION :: NAME (^NUMBER)? */
function parseDimension(tokens: Tokens): Dimension {
    const product = tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)
        ? tokens.read(Sym.Operator)
        : undefined;
    const name = tokens.nextIs(Sym.Name) ? tokens.read(Sym.Name) : undefined;
    let caret = undefined;
    let exponent = undefined;
    if (
        tokens.nextIs(Sym.Operator, EXPONENT_SYMBOL) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        caret = tokens.read(Sym.Operator);
        exponent =
            tokens.nextIs(Sym.Number) && tokens.nextLacksPrecedingSpace()
                ? tokens.read(Sym.Number)
                : undefined;
    }
    return new Dimension(product, name, caret, exponent);
}

/** TEXT :: text name? TEXT? */
function parseText(tokens: Tokens): TextLiteral {
    const texts: Translation[] = [];

    // Read a series of Translations lacking separating space.
    do {
        texts.push(parseTranslation(tokens));
    } while (tokens.nextIs(Sym.Text) && tokens.nextLacksPrecedingSpace());

    return new TextLiteral(texts);
}

function parseTranslation(tokens: Tokens): Translation {
    const text = tokens.read(Sym.Text);
    const segments: TranslationSegment[] = [];
    while (tokens.nextIs(Sym.Words) || tokens.nextIs(Sym.Code)) {
        if (tokens.nextIs(Sym.Words)) segments.push(tokens.read(Sym.Words));
        else if (tokens.nextIs(Sym.Code)) segments.push(parseExample(tokens));
    }
    const close = tokens.nextIs(Sym.Text) ? tokens.read(Sym.Text) : undefined;
    const language = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new Translation(text, segments, close, language);
}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): ListLiteral {
    const open = tokens.read(Sym.ListOpen);
    const values: Expression[] = [];

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.ListClose) &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        values.push(parseExpression(tokens));

    const close = tokens.readIf(Sym.ListClose);

    return new ListLiteral(open, values, close);
}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(Sym.ListOpen);
        const index = parseExpression(tokens);
        const close = tokens.readIf(Sym.ListClose);

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(Sym.ListOpen));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } | {:} */
function parseSetOrMap(tokens: Tokens): MapLiteral | SetLiteral {
    const open = tokens.read(Sym.SetOpen);
    const values: (Expression | KeyValue)[] = [];

    // Is this an empty map?
    if (tokens.nextAre(Sym.Bind, Sym.SetClose)) {
        const bind = tokens.read(Sym.Bind);
        return new MapLiteral(open, [], bind, tokens.read(Sym.SetClose));
    }

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.SetClose) &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextHasMoreThanOneLineBreak()
    ) {
        const key = parseExpression(tokens);
        if (tokens.nextIs(Sym.Bind)) {
            const bind = tokens.read(Sym.Bind);
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, value, bind));
        } else values.push(key);
    }

    const close = tokens.readIf(Sym.SetClose);

    // Make a map
    return values.some((v): v is KeyValue => v instanceof KeyValue)
        ? new MapLiteral(open, values, undefined, close)
        : new SetLiteral(open, values as Expression[], close);
}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetOrMapAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(Sym.SetOpen);
        const key = parseExpression(tokens);

        const close = tokens.nextIs(Sym.SetClose)
            ? tokens.read(Sym.SetClose)
            : undefined;

        left = new SetOrMapAccess(left, open, key, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (
        tokens.hasNext() &&
        tokens.nextIs(Sym.SetOpen) &&
        !tokens.nextHasMoreThanOneLineBreak()
    );

    // Return the series of accesses and evaluations we created.
    return left;
}

/** PREVIOUS :: ← EXPRESSION →? EXPRESSION  */
function parsePrevious(tokens: Tokens): Previous {
    const previous = tokens.read(Sym.Previous);
    const range = tokens.nextIs(Sym.Previous)
        ? tokens.read(Sym.Previous)
        : undefined;
    const index = parseExpression(tokens);
    const stream = parseExpression(tokens);

    return new Previous(previous, range, index, stream);
}

/** TABLE :: ⎡ BIND* ⎦ ROWS* */
function parseTable(tokens: Tokens): TableLiteral {
    const type = parseTableType(tokens);

    // Read the rows.
    const rows = [];
    while (tokens.nextIs(Sym.TableOpen)) rows.push(parseRow(tokens));

    return new TableLiteral(type, rows);
}

/** ROW :: ⎡ (BIND|EXPRESSION)* ⎦ */
function parseRow(tokens: Tokens, expected: Sym = Sym.TableOpen): Row {
    const open = tokens.read(expected);

    const cells: (Bind | Expression)[] = [];
    // Read the cells.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextIs(Sym.TableClose) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        cells.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    // Read the closing row marker.
    const close = tokens.readIf(Sym.TableClose);

    return new Row(open, cells, close);
}

/** SELECT :: EXPRESSION |? ROW EXPRESSION */
function parseSelect(table: Expression, tokens: Tokens): Select {
    const row = parseRow(tokens, Sym.Select);
    const query = parseExpression(tokens);

    return new Select(table, row, query);
}

/** INSERT :: EXPRESSION |+ ROW */
function parseInsert(table: Expression, tokens: Tokens): Insert {
    const row = parseRow(tokens, Sym.Insert);

    return new Insert(table, row);
}

/** UPDATE :: EXPRESSION |: ROW EXPRESSION */
function parseUpdate(table: Expression, tokens: Tokens): Update {
    const row = parseRow(tokens, Sym.Update);
    const query = parseExpression(tokens);

    return new Update(table, row, query);
}

/** DELETE :: EXPRESSION |- EXPRESSION */
function parseDelete(table: Expression, tokens: Tokens): Delete {
    const del = tokens.read(Sym.Delete);
    const query = parseExpression(tokens);

    return new Delete(table, del, query);
}

/** STREAM :: EXPRESSION … EXPRESSION */
function parseReaction(initial: Expression, tokens: Tokens): Reaction {
    const dots = tokens.read(Sym.Stream);
    const condition = parseExpression(tokens, false, false);
    const nextdots = tokens.nextIs(Sym.Stream)
        ? tokens.read(Sym.Stream)
        : undefined;
    const next = parseExpression(tokens, false, false);
    return new Reaction(initial, dots, condition, nextdots, next);
}

/** FUNCTION :: DOCS? (ƒ | ALIASES) TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
export function parseFunction(tokens: Tokens): FunctionDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.nextIs(Sym.Share) ? tokens.read(Sym.Share) : undefined;

    const fun = tokens.read(Sym.Function);
    const names = parseNames(tokens);

    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;

    const inputs: Bind[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        tokens.nextIsnt(Sym.EvalClose) &&
        nextIsBind(tokens, false)
    )
        inputs.push(parseBind(tokens));

    const close = tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;

    let dot;
    let output;
    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        output = parseType(tokens);
    }

    let expression =
        !tokens.hasNext() || tokens.nextHasMoreThanOneLineBreak()
            ? undefined
            : parseExpression(tokens);

    if (expression instanceof Block) expression = expression.asFunctionBlock();

    return new FunctionDefinition(
        docs,
        share,
        fun,
        names,
        types,
        open,
        inputs,
        close,
        dot,
        output,
        expression
    );
}

/** EVAL :: EXPRESSION (<TYPE*>)? (EXPRESSION*) */
function parseEvaluate(left: Expression, tokens: Tokens): Evaluate {
    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;

    const open = tokens.read(Sym.EvalOpen);
    const inputs: Expression[] = [];

    // This little peek at space just prevents runaway parsing. It uses space to make an assumption that everything below isn't part of the evaluate.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        tokens.nextIsnt(Sym.EvalClose) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        inputs.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    const close = tokens.readIf(Sym.EvalClose);

    return new Evaluate(left, types, open, inputs, close);
}

/** CONVERSION :: DOCS? TYPE → TYPE EXPRESSION */
function parseConversion(tokens: Tokens): ConversionDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const convert = tokens.read(Sym.Convert);
    const input = parseType(tokens, true);
    const output = parseType(tokens, true);
    const expression = parseExpression(tokens);

    return new ConversionDefinition(docs, convert, input, output, expression);
}

/** CONVERT :: EXPRESSION → TYPE */
function parseConvert(expression: Expression, tokens: Tokens): Convert {
    const convert = tokens.read(Sym.Convert);
    const type = parseType(tokens, true);

    return new Convert(expression, convert, type);
}

/** TYPE_VARS :: <NAMES*> */
function parseTypeVariables(tokens: Tokens): TypeVariables {
    const open = tokens.read(Sym.TypeOpen);
    const variables: TypeVariable[] = [];
    while (tokens.hasNext() && tokens.nextIs(Sym.Name))
        variables.push(new TypeVariable(parseNames(tokens)));
    const close = tokens.nextIs(Sym.TypeClose)
        ? tokens.read(Sym.TypeClose)
        : undefined;
    return new TypeVariables(open, variables, close);
}

function parseTypeInputs(tokens: Tokens): TypeInputs {
    const open = tokens.read(Sym.TypeOpen);
    const inputs: Type[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.TypeClose) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        inputs.push(parseType(tokens));
    const close = tokens.readIf(Sym.TypeClose);
    return new TypeInputs(open, inputs, close);
}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parsePropertyReference(left: Expression, tokens: Tokens): Expression {
    if (!tokens.nextIs(Sym.Access)) return left;
    do {
        const access = tokens.read(Sym.Access);
        // See if there's a name, operator, or placeholder next, all of which are valid property names.
        // Note that we require it to be on the same line or the next line, but not later.
        let name;
        if (
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder, Sym.Operator) &&
            !tokens.nextHasMoreThanOneLineBreak()
        )
            name = tokens.read();

        left = new PropertyReference(
            left,
            access,
            name ? new Reference(name) : undefined
        );

        // If there's a bind symbol next, then parse a PropertyBind
        if (left instanceof PropertyReference && tokens.nextIs(Sym.Bind)) {
            const bind = tokens.read(Sym.Bind);
            const value = parseExpression(tokens);

            left = new PropertyBind(left, bind, value);
        }

        // But wait, is it a function evaluation?
        if (
            tokens.nextIsOneOf(Sym.EvalOpen, Sym.TypeOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(Sym.Access));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** TYPE :: (? | name | MEASUREMENT_TYPE | TEXT_TYPE | NONE_TYPE | LIST_TYPE | SET_TYPE | FUNCTION_TYPE | STREAM_TYPE) (| TYPE)* */
export function parseType(tokens: Tokens, isExpression = false): Type {
    let left: Type = tokens.nextIs(Sym.Placeholder)
        ? new TypePlaceholder(tokens.read(Sym.Placeholder))
        : tokens.nextIs(Sym.Name)
        ? parseNameType(tokens)
        : tokens.nextIs(Sym.BooleanType)
        ? new BooleanType(tokens.read(Sym.BooleanType))
        : tokens.nextIs(Sym.Operator, '%') ||
          tokens.nextIsOneOf(Sym.Number, Sym.NumberType)
        ? parseNumberType(tokens)
        : tokens.nextIs(Sym.Text)
        ? parseTextType(tokens)
        : tokens.nextIs(Sym.None)
        ? parseNoneType(tokens)
        : tokens.nextIs(Sym.ListOpen)
        ? parseListType(tokens)
        : tokens.nextIs(Sym.SetOpen)
        ? parseSetOrMapType(tokens)
        : tokens.nextIs(Sym.TableOpen)
        ? parseTableType(tokens)
        : tokens.nextIs(Sym.Function)
        ? parseFunctionType(tokens)
        : tokens.nextIs(Sym.Stream)
        ? parseStreamType(tokens)
        : // We use the doc symbol because it looks like an empty formatted
        tokens.nextIs(Sym.FormattedType)
        ? parseFormattedType(tokens)
        : new UnparsableType(tokens.readLine());

    if (!isExpression && tokens.nextIs(Sym.Convert))
        left = parseConversionType(left, tokens);

    while (tokens.nextIs(Sym.Union)) {
        const or = tokens.read(Sym.Union);
        left = new UnionType(left, or, parseType(tokens));
    }

    return left;
}

function parseNameType(tokens: Tokens): NameType {
    const name = tokens.read(Sym.Name);
    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;
    return new NameType(name, types);
}

/** TEXT_TYPE :: TEXT LANGUAGE? */
function parseTextType(tokens: Tokens): TextType {
    const open = tokens.read(Sym.Text);
    const words = tokens.nextIs(Sym.Words) ? tokens.read(Sym.Words) : undefined;
    const close = tokens.nextIs(Sym.Text) ? tokens.read(Sym.Text) : undefined;
    const format = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new TextType(open, words, close, format);
}

/** NUMBER_TYPE :: #NAME? */
function parseNumberType(tokens: Tokens): NumberType {
    if (tokens.nextIs(Sym.Operator, '%'))
        return new NumberType(tokens.read(Sym.Operator));

    const number = tokens.nextIs(Sym.Number)
        ? tokens.read(Sym.Number)
        : tokens.read(Sym.NumberType);
    const unit =
        tokens.nextIsOneOf(Sym.Conditional, Sym.Name, Sym.Language) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberType(number, unit);
}

/** NONE_TYPE :: !NAME? */
function parseNoneType(tokens: Tokens): NoneType {
    const none = tokens.read(Sym.None);
    return new NoneType(none);
}

/** STREAM_TYPE :: … TYPE */
function parseStreamType(tokens: Tokens): StreamType {
    const stream = tokens.read(Sym.Stream);
    const type = parseType(tokens);
    return new StreamType(stream, type);
}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType {
    const open = tokens.read(Sym.ListOpen);
    const type = tokens.nextIsnt(Sym.ListClose) ? parseType(tokens) : undefined;
    const close = tokens.nextIs(Sym.ListClose)
        ? tokens.read(Sym.ListClose)
        : undefined;
    return new ListType(open, type, close);
}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetOrMapType(tokens: Tokens): SetType | MapType {
    const open = tokens.read(Sym.SetOpen);
    let key = undefined;
    let bind = undefined;
    let value = undefined;
    if (tokens.nextIsnt(Sym.SetClose)) {
        if (!tokens.nextIs(Sym.Bind)) key = parseType(tokens);
        bind = tokens.readIf(Sym.Bind);
        value =
            bind !== undefined && !tokens.nextIs(Sym.SetClose)
                ? parseType(tokens)
                : undefined;
    }
    const close = tokens.readIf(Sym.SetClose);
    return bind === undefined
        ? new SetType(open, key, close)
        : new MapType(open, key, bind, value, close);
}

/** TABLE_TYPE :: (| BIND)+ | */
function parseTableType(tokens: Tokens): TableType {
    const open = tokens.read(Sym.TableOpen);

    const columns: Bind[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextIs(Sym.TableClose)
    ) {
        const bind = nextIsBind(tokens, false) ? parseBind(tokens) : undefined;
        if (bind === undefined) break;
        else columns.push(bind);
    }
    const close = tokens.readIf(Sym.TableClose);
    return new TableType(open, columns, close);
}

/** FUNCTION_TYPE :: ƒ( BIND* ) TYPE */
function parseFunctionType(tokens: Tokens): FunctionType {
    const fun = tokens.read(Sym.Function);

    const typeVars = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.readIf(Sym.EvalOpen);

    const inputs: Bind[] = [];
    while (nextIsBind(tokens, false)) inputs.push(parseBind(tokens));

    const close = tokens.readIf(Sym.EvalClose);

    const output = parseType(tokens);

    return new FunctionType(fun, typeVars, open, inputs, close, output);
}

/** CONVERSION_TYPE :: TYPE → TYPE */
function parseConversionType(left: Type, tokens: Tokens): ConversionType {
    const convert = tokens.read(Sym.Convert);
    const to = parseType(tokens);

    return new ConversionType(left, convert, to);
}

/** CUSTOM_TYPE :: DOCS? •NAMES (•NAME)* TYPE_VARS ( BIND* ) BLOCK? */
export function parseStructure(tokens: Tokens): StructureDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.nextIs(Sym.Share) ? tokens.read(Sym.Share) : undefined;

    const type = tokens.read(Sym.Type);
    const names = parseNames(tokens);

    const interfaces: Reference[] = [];
    while (tokens.nextIs(Sym.Name)) interfaces.push(parseReference(tokens));

    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;
    const open = tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;
    const inputs: Bind[] = [];
    while (tokens.nextIsnt(Sym.EvalClose) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));
    const close = tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;
    const block = nextAreOptionalDocsThen(tokens, [Sym.EvalOpen])
        ? parseBlock(tokens, BlockKind.Structure)
        : undefined;

    return new StructureDefinition(
        docs,
        share,
        type,
        names,
        interfaces,
        types,
        open,
        inputs,
        close,
        block
    );
}

function parseFormattedType(tokens: Tokens): FormattedType {
    return new FormattedType(tokens.read(Sym.FormattedType));
}

export function parseFormattedLiteral(tokens: Tokens): FormattedLiteral {
    const translations: FormattedTranslation[] = [];
    do {
        translations.push(parseFormattedTranslation(tokens));
    } while (
        tokens.nextIs(Sym.Formatted) &&
        !tokens.nextHasMoreThanOneLineBreak()
    );
    return new FormattedLiteral(translations);
}

export function parseFormattedTranslation(
    tokens: Tokens
): FormattedTranslation {
    const open = tokens.read(Sym.Formatted);
    const content = parseMarkup(tokens);
    const close = tokens.readIf(Sym.Formatted);
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new FormattedTranslation(open, content, close, lang);
}

export function parseDocs(tokens: Tokens): Docs {
    const docs: Doc[] = [];
    do {
        docs.push(parseDoc(tokens));
    } while (
        tokens.nextIs(Sym.Doc) &&
        (tokens.peekSpace()?.split('\n').length ?? 0) - 1 <= 1
    );
    return new Docs([docs[0], ...docs.slice(1)]);
}

export function parseDoc(tokens: Tokens): Doc {
    const open = tokens.read(Sym.Doc);
    const content = parseMarkup(tokens);
    const close = tokens.readIf(Sym.Doc);
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new Doc(open, content, close, lang);
}

function nextIsContent(tokens: Tokens) {
    return tokens.nextIsOneOf(
        Sym.Words,
        Sym.TagOpen,
        Sym.Concept,
        Sym.Code,
        Sym.Mention,
        Sym.Italic,
        Sym.Light,
        Sym.Bold,
        Sym.Underline,
        Sym.Extra
    );
}

export function parseMarkup(tokens: Tokens): Markup {
    const content: Paragraph[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Doc) &&
        nextIsContent(tokens)
    )
        content.push(parseParagraph(tokens));
    return new Markup(content, tokens.getSpaces());
}

export function parseLocaleDoc(doc: string) {
    return parseDoc(toTokens(DOCS_SYMBOL + doc + DOCS_SYMBOL));
}

function parseParagraph(tokens: Tokens): Paragraph {
    const content: Segment[] = [];

    // Read until hitting two newlines or a closing doc symbol.
    // Stop the paragraph if the content we just parsed has a Words with two or more line breaks.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Doc) &&
        nextIsContent(tokens)
    ) {
        content.push(parseSegment(tokens));
        if (tokens.nextHasMoreThanOneLineBreak()) break;
    }

    return new Paragraph(content);
}

function parseSegment(tokens: Tokens) {
    return tokens.nextIs(Sym.Words)
        ? tokens.read(Sym.Words)
        : tokens.nextIs(Sym.TagOpen)
        ? parseWebLink(tokens)
        : tokens.nextIs(Sym.Concept)
        ? parseConceptLink(tokens)
        : tokens.nextIs(Sym.Code)
        ? parseExample(tokens)
        : tokens.nextIs(Sym.Mention)
        ? parseMention(tokens)
        : parseWords(tokens);
}

function parseWebLink(tokens: Tokens): WebLink {
    const open = tokens.read(Sym.TagOpen);
    const description = tokens.readIf(Sym.Words);
    const at = tokens.readIf(Sym.Link);
    const url = tokens.read();
    const close = tokens.readIf(Sym.TagClose);

    return new WebLink(open, description, at, url, close);
}

function parseConceptLink(tokens: Tokens): ConceptLink {
    const concept = tokens.read(Sym.Concept);
    return new ConceptLink(concept);
}

const Formats = [Sym.Italic, Sym.Underline, Sym.Light, Sym.Bold, Sym.Extra];

function parseWords(tokens: Tokens): Words {
    // Read an optional format
    const open = tokens.nextIsOneOf(...Formats) ? tokens.read() : undefined;

    // Figure out what token type it is.
    let format: Sym | undefined = undefined;
    if (open !== undefined) {
        const types = new Set(Formats);
        const intersection = open.types.filter((type) => types.has(type));
        if (intersection.length > 0) format = intersection[0];
    }

    // Read segments until reaching the matching closing format or the end of the paragraph or the end of the doc or there are no more tokens.
    const segments: Segment[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Doc) &&
        (format === undefined || !tokens.nextIs(format)) &&
        nextIsContent(tokens)
    ) {
        segments.push(
            tokens.nextIs(Sym.Words)
                ? tokens.read(Sym.Words)
                : parseSegment(tokens)
        );
        if (tokens.nextHasMoreThanOneLineBreak()) break;
    }

    // Read closing format if it matches.
    const close = format && tokens.nextIs(format) ? tokens.read() : undefined;

    return new Words(open, segments, close);
}

function parseExample(tokens: Tokens): Example {
    const open = tokens.read(Sym.Code);
    const program = parseProgram(tokens, true);
    const close = tokens.readIf(Sym.Code);

    return new Example(open, program, close);
}

function parseMention(tokens: Tokens): Mention | Branch {
    const name = tokens.read();
    const mention = new Mention(name);

    if (tokens.nextIs(Sym.ListOpen)) return parseBranch(mention, tokens);
    else return mention;
}

function parseBranch(mention: Mention, tokens: Tokens): Branch {
    const open = tokens.read(Sym.ListOpen);
    const yes = parseWords(tokens);
    const bar = tokens.nextIs(Sym.Union) ? tokens.read(Sym.Union) : undefined;
    const no = parseWords(tokens);
    const close = tokens.nextIs(Sym.ListClose)
        ? tokens.read(Sym.ListClose)
        : undefined;
    return new Branch(mention, open, yes, bar, no, close);
}
