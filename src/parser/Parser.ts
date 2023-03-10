import { tokenize } from './Tokenizer';
import { DOCS_SYMBOL, EXPONENT_SYMBOL, PRODUCT_SYMBOL } from './Symbols';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import Program from '@nodes/Program';
import Borrow from '@nodes/Borrow';
import Block from '@nodes/Block';
import ListLiteral from '@nodes/ListLiteral';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import UnaryOperation from '@nodes/UnaryOperation';
import BinaryOperation from '@nodes/BinaryOperation';
import PropertyReference from '@nodes/PropertyReference';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Template from '@nodes/Template';
import UnionType from '@nodes/UnionType';
import NoneLiteral from '@nodes/NoneLiteral';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import MeasurementType from '@nodes/MeasurementType';
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
import Paragraph from '@nodes/Paragraph';
import type { Content } from '@nodes/Paragraph';
import WebLink from '@nodes/WebLink';
import ConceptLink from '@nodes/ConceptLink';
import Words from '@nodes/Words';
import Example from '@nodes/Example';
import PropertyBind from '../nodes/PropertyBind';
import Initial from '../nodes/Initial';

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
        return this.#unread.length > 0 && !this.#unread[0].is(TokenType.END);
    }

    nextIsEnd(): boolean {
        return this.#unread.length > 0 && this.#unread[0].is(TokenType.END);
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: TokenType, text?: string): boolean {
        return (
            this.hasNext() &&
            this.peek()?.is(type) === true &&
            (text === undefined || this.peekText() === text)
        );
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: TokenType): boolean {
        return this.hasNext() && this.peek()?.isnt(type) === true;
    }

    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: TokenType[]) {
        return types.every(
            (type, index) =>
                index < this.#unread.length && this.#unread[index].is(type)
        );
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: TokenType): boolean {
        return (
            this.#read.length > 0 && this.#read[this.#read.length - 1].is(type)
        );
    }

    beforeNextLineIs(type: TokenType) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        while (index < this.#unread.length) {
            const token = this.#unread[index];
            if (index > 0 && this.#spaces.hasLineBreak(this.#unread[index]))
                break;
            if (token.is(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return index < this.#unread.length && this.#unread[index].is(type);
    }

    nextIsOneOf(...types: TokenType[]): boolean {
        return types.find((type) => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextLacksPrecedingSpace(): boolean {
        return this.hasNext() && !this.#spaces.hasSpace(this.#unread[0]);
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
    read(expectedType?: TokenType): Token {
        const next = this.#unread.shift();
        if (next !== undefined) {
            if (expectedType !== undefined && !next.is(expectedType)) {
                throw new Error(
                    `Internal parsing error at ${this.#read
                        .slice(this.#read.length - 10, this.#read.length)
                        .map((t) => t.toWordplay())
                        .join('')} *** ${this.#unread
                        .slice(0, 10)
                        .map((t) => t.toWordplay())
                        .join(
                            ''
                        )}; expected ${expectedType}, received ${next.toString()}`
                );
            }
            this.#read.push(next);
            return next;
        } else return new Token('', TokenType.END);
    }

    readIf(type: TokenType) {
        return this.nextIs(type) ? this.read() : undefined;
    }

    readLine() {
        const nodes: Node[] = [];
        if (!this.hasNext()) return nodes;
        // Read at least one token, then keep going until we reach a token with a line break.
        do {
            nodes.push(this.read());
        } while (this.hasNext() && this.nextHasPrecedingLineBreak() === false);
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

// PROGRAM :: BORROW* BLOCK
export function parseProgram(tokens: Tokens, doc: boolean = false): Program {
    // If a borrow is next or there's no whitespace, parse a docs.
    const docs = parseDocs(tokens);

    const borrows = [];
    while (tokens.hasNext() && tokens.nextIs(TokenType.BORROW))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(tokens, true, false, doc);

    // If the next token is the end, we're done! Otherwise, read all of the remaining
    // tokens and bundle them into an unparsable.
    const end = tokens.nextIsEnd()
        ? tokens.read(TokenType.END)
        : new Token('', TokenType.END);

    return new Program(docs, borrows, block, end);
}

// BORROW :: ↓ name number?
export function parseBorrow(tokens: Tokens): Borrow {
    const borrow = tokens.read(TokenType.BORROW);
    const source = tokens.readIf(TokenType.NAME);
    const dot = tokens.readIf(TokenType.ACCESS);
    const name =
        dot && tokens.nextIs(TokenType.NAME)
            ? tokens.read(TokenType.NAME)
            : undefined;
    const version =
        tokens.nextIs(TokenType.NUMBER) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(TokenType.NUMBER)
            : undefined;

    return new Borrow(borrow, source, dot, name, version);
}

/** BLOCK :: DOCS ? ( [BIND|EXPRESSION]+ )  */
export function parseBlock(
    tokens: Tokens,
    root: boolean = false,
    creator: boolean = false,
    doc: boolean = false
): Block {
    // Grab any documentation if this isn't a root.
    let docs = root ? undefined : parseDocs(tokens);

    const open = root
        ? undefined
        : tokens.nextIs(TokenType.EVAL_OPEN)
        ? tokens.read(TokenType.EVAL_OPEN)
        : undefined;

    const statements = [];
    while (
        tokens.hasNext() &&
        ((root && !doc) || tokens.nextIsnt(TokenType.EVAL_CLOSE))
    )
        statements.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens, true)
        );

    const close = root
        ? undefined
        : tokens.nextIs(TokenType.EVAL_CLOSE)
        ? tokens.read(TokenType.EVAL_CLOSE)
        : undefined;

    return new Block(statements, root, creator, open, close, docs);
}

function nextAreOptionalDocsThen(tokens: Tokens, type: TokenType): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    // We don't actually care what the docs are or if there are any.
    parseDocs(tokens);

    // Is the next the type?
    const nextIsType = tokens.nextIs(type);

    // Rollback
    tokens.unreadTo(rollbackToken);

    // It's a bind if it has a name and a bind symbol.
    return nextIsType;
}

function nextIsEvaluate(tokens: Tokens): boolean {
    if (!tokens.nextLacksPrecedingSpace()) return false;

    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    if (tokens.nextIs(TokenType.TYPE_OPEN)) parseTypeInputs(tokens);

    const nextIsEval = tokens.nextIs(TokenType.EVAL_OPEN);

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

    // It's a bind if it has a name and a bind symbol.
    return bind.names.names.length > 0 && (!expectValue || bind.hasValue());
}

/** BIND :: NAMES TYPE? (: EXPRESSION)? */
export function parseBind(tokens: Tokens): Bind {
    let docs = parseDocs(tokens);
    const share = tokens.readIf(TokenType.SHARE);
    const names = parseNames(tokens);
    const etc = tokens.readIf(TokenType.ETC);
    let colon;
    let value;
    let dot;
    let type;

    if (tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read(TokenType.TYPE);
        type = parseType(tokens);
    }

    if (tokens.nextIs(TokenType.BIND)) {
        colon = tokens.read(TokenType.BIND);
        value = parseExpression(tokens);
    }

    return new Bind(docs, share, names, etc, dot, type, colon, value);
}

/** ALIAS :: (name LANGUAGE?)+ */
export function parseNames(tokens: Tokens): Names {
    const names: Name[] = [];

    while (
        (tokens.hasNext() &&
            names.length > 0 &&
            tokens.nextIs(TokenType.NAME_SEPARATOR)) ||
        (names.length === 0 &&
            tokens.nextIsOneOf(TokenType.NAME, TokenType.PLACEHOLDER))
    ) {
        const comma = tokens.nextIs(TokenType.NAME_SEPARATOR)
            ? tokens.read(TokenType.NAME_SEPARATOR)
            : undefined;
        if (names.length > 0 && comma === undefined) break;
        const name = tokens.nextIs(TokenType.NAME)
            ? tokens.read(TokenType.NAME)
            : tokens.nextIs(TokenType.PLACEHOLDER)
            ? tokens.read(TokenType.PLACEHOLDER)
            : undefined;
        const lang = tokens.nextIs(TokenType.LANGUAGE)
            ? parseLanguage(tokens)
            : undefined;
        if (name !== undefined) names.push(new Name(comma, name, lang));
        else break;
    }

    return new Names(names);
}

/** LANGUAGE :: / name */
export function parseLanguage(tokens: Tokens): Language {
    const slash = tokens.read(TokenType.LANGUAGE);
    const lang =
        tokens.nextIs(TokenType.NAME) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(TokenType.NAME)
            : undefined;
    return new Language(slash, lang);
}

/** EXPRESSION :: BINARY_OPERATION [ conditional EXPRESSION EXPRESSION ]? */
export function parseExpression(
    tokens: Tokens,
    expectSpace: boolean = false
): Expression {
    // If the next token has more than one preceding line break, just return an unparsable.
    // This prevents runaway expressions and provides an opportunity to provide feedback precisely
    // where the expression was expected.
    if (!expectSpace && tokens.nextHasMoreThanOneLineBreak())
        return new UnparsableExpression([]);

    const left = parseBinaryOperation(tokens);

    // Is it conditional statement?
    if (tokens.nextIs(TokenType.CONDITIONAL)) {
        const question = tokens.read(TokenType.CONDITIONAL);
        const yes = parseExpression(tokens);

        // Is it a Reaction?
        if (tokens.nextIs(TokenType.STREAM)) {
            return parseReaction(left, question, yes, tokens);
        }
        // Otherwise its a Conditional.
        else {
            const no = parseExpression(tokens);
            return new Conditional(left, question, yes, no);
        }
    } else return left;
}

/** BINARY_OPERATION :: ATOMIC_EXPRESSION [ binary_op ATOMIC_EXPRESSION ]* */
export function parseBinaryOperation(tokens: Tokens): Expression {
    let left = parseAtomicExpression(tokens);

    while (
        tokens.hasNext() &&
        (tokens.nextIs(TokenType.BINARY_OP) ||
            (tokens.nextIs(TokenType.TYPE_OP) &&
                !tokens.nextHasPrecedingLineBreak()))
    ) {
        left = tokens.nextIs(TokenType.TYPE_OP)
            ? new Is(left, tokens.read(TokenType.TYPE_OP), parseType(tokens))
            : new BinaryOperation(
                  left,
                  tokens.read(TokenType.BINARY_OP),
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
        tokens.nextIs(TokenType.THIS)
            ? new This(tokens.read(TokenType.THIS))
            : // Placeholder
            tokens.nextIs(TokenType.PLACEHOLDER)
            ? parsePlaceholder(tokens)
            : // Start
            tokens.nextIs(TokenType.INITIAL)
            ? parseInitial(tokens)
            : // Change
            tokens.nextIs(TokenType.CHANGE)
            ? parseChanged(tokens)
            : // Nones
            tokens.nextIs(TokenType.NONE)
            ? parseNone(tokens)
            : // Names or booleans are easy
            tokens.nextIs(TokenType.NAME)
            ? parseReference(tokens)
            : // Booleans
            tokens.nextIs(TokenType.BOOLEAN)
            ? new BooleanLiteral(tokens.read(TokenType.BOOLEAN))
            : // Numbers with units
            tokens.nextIs(TokenType.NUMBER)
            ? parseMeasurement(tokens)
            : // Text with optional formats
            tokens.nextIs(TokenType.TEXT)
            ? parseText(tokens)
            : // A string template
            tokens.nextIs(TokenType.TEXT_OPEN)
            ? parseTemplate(tokens)
            : // A list
            tokens.nextIs(TokenType.LIST_OPEN)
            ? parseList(tokens)
            : // A set or map
            tokens.nextIs(TokenType.SET_OPEN)
            ? parseSetOrMap(tokens)
            : // Table literals
            tokens.nextIs(TokenType.TABLE_OPEN)
            ? parseTable(tokens)
            : // A block expression
            nextAreOptionalDocsThen(tokens, TokenType.EVAL_OPEN)
            ? parseBlock(tokens)
            : // A structure definition
            nextAreOptionalDocsThen(tokens, TokenType.TYPE)
            ? parseStructure(tokens)
            : // A function function
            nextAreOptionalDocsThen(tokens, TokenType.FUNCTION)
            ? parseFunction(tokens)
            : // A conversion function.
            nextAreOptionalDocsThen(tokens, TokenType.CONVERT)
            ? parseConversion(tokens)
            : // A documented expression
            tokens.nextIs(TokenType.DOC)
            ? parseDocumentedExpression(tokens)
            : // Unary expressions!
            tokens.nextIs(TokenType.UNARY_OP)
            ? new UnaryOperation(
                  tokens.read(TokenType.UNARY_OP),
                  parseAtomicExpression(tokens)
              )
            : // Unknown expression
              new UnparsableExpression(tokens.readLine());

    // But wait! Is it one or more infix expressions? Slurp them up.
    while (true) {
        if (tokens.nextIs(TokenType.ACCESS))
            left = parsePropertyReference(left, tokens);
        else if (
            tokens.nextIs(TokenType.LIST_OPEN) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseListAccess(left, tokens);
        else if (
            tokens.nextIs(TokenType.SET_OPEN) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseSetOrMapAccess(left, tokens);
        else if (tokens.nextIs(TokenType.PREVIOUS))
            left = parsePrevious(left, tokens);
        else if (nextIsEvaluate(tokens)) left = parseEvaluate(left, tokens);
        else if (tokens.nextIs(TokenType.CONVERT))
            left = parseConvert(left, tokens);
        else if (tokens.nextIs(TokenType.SELECT))
            left = parseSelect(left, tokens);
        else if (tokens.nextIs(TokenType.INSERT))
            left = parseInsert(left, tokens);
        else if (tokens.nextIs(TokenType.UPDATE))
            left = parseUpdate(left, tokens);
        else if (tokens.nextIs(TokenType.DELETE))
            left = parseDelete(left, tokens);
        else break;
    }
    return left;
}

function parsePlaceholder(tokens: Tokens): ExpressionPlaceholder {
    const placeholder = tokens.read(TokenType.PLACEHOLDER);

    let dot;
    let type;
    if (tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read(TokenType.TYPE);
        type = parseType(tokens);
    }

    return new ExpressionPlaceholder(placeholder, dot, type);
}

function parseInitial(tokens: Tokens): Initial {
    const diamond = tokens.read(TokenType.INITIAL);
    return new Initial(diamond);
}

function parseReference(tokens: Tokens): Reference {
    const name = tokens.read(TokenType.NAME);

    return new Reference(name);
}

function parseChanged(tokens: Tokens): Changed {
    const change = tokens.read(TokenType.CHANGE);
    const stream = parseAtomicExpression(tokens);

    return new Changed(change, stream);
}

function parseDocumentedExpression(tokens: Tokens): Expression {
    const docs = parseDocs(tokens);
    const expression = parseExpression(tokens);
    return docs ? new DocumentedExpression(docs, expression) : expression;
}

/** NONE :: ! ALIASES */
function parseNone(tokens: Tokens): NoneLiteral {
    const error = tokens.read(TokenType.NONE);
    return new NoneLiteral(error);
}

/** NUMBER :: number name? */
export function parseMeasurement(tokens: Tokens): MeasurementLiteral {
    const number = tokens.read(TokenType.NUMBER);
    const unit =
        tokens.nextIsOneOf(TokenType.NAME, TokenType.LANGUAGE) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new MeasurementLiteral(number, unit ?? Unit.Empty);
}

/** UNIT :: DIMENSION (·DIMENSION)* (/ DIMENSION (·DIMENSION*))? */
function parseUnit(tokens: Tokens): Unit {
    // Parse a wildcard unit.
    if (tokens.nextIs(TokenType.CONDITIONAL)) {
        return new Unit(
            undefined,
            [
                new Dimension(
                    undefined,
                    tokens.read(TokenType.CONDITIONAL),
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
        (tokens.nextIs(TokenType.NAME) ||
            tokens.nextIs(TokenType.BINARY_OP, PRODUCT_SYMBOL)) &&
        tokens.nextLacksPrecedingSpace()
    )
        numerator.push(parseDimension(tokens));

    let slash = undefined;
    const denominator: Dimension[] = [];
    if (tokens.nextIs(TokenType.LANGUAGE)) {
        slash = tokens.read(TokenType.LANGUAGE);
        while (
            (tokens.nextIs(TokenType.NAME) ||
                tokens.nextIs(TokenType.BINARY_OP, PRODUCT_SYMBOL)) &&
            tokens.nextLacksPrecedingSpace()
        )
            denominator.push(parseDimension(tokens));
    }

    return new Unit(undefined, numerator, slash, denominator);
}

/** DIMENSION :: NAME (^NUMBER)? */
function parseDimension(tokens: Tokens): Dimension {
    const product = tokens.nextIs(TokenType.BINARY_OP, PRODUCT_SYMBOL)
        ? tokens.read(TokenType.BINARY_OP)
        : undefined;
    const name = tokens.read(TokenType.NAME);
    let caret = undefined;
    let exponent = undefined;
    if (
        tokens.nextIs(TokenType.BINARY_OP, EXPONENT_SYMBOL) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        caret = tokens.read(TokenType.BINARY_OP);
        exponent =
            tokens.nextIs(TokenType.NUMBER) && tokens.nextLacksPrecedingSpace()
                ? tokens.read(TokenType.NUMBER)
                : undefined;
    }
    return new Dimension(product, name, caret, exponent);
}

/** TEXT :: text name? */
function parseText(tokens: Tokens): TextLiteral {
    const text = tokens.read(TokenType.TEXT);
    const format = tokens.nextIs(TokenType.LANGUAGE)
        ? parseLanguage(tokens)
        : undefined;
    return new TextLiteral(text, format);
}

/** TEMPLATE :: text_open ( EXPRESSION text_between )* EXPRESSION text_close name? */
function parseTemplate(tokens: Tokens): Template {
    const open = tokens.read(TokenType.TEXT_OPEN);
    const expressions: (Expression | Token)[] = [];

    do {
        expressions.push(parseExpression(tokens));
        const close = tokens.nextIs(TokenType.TEXT_BETWEEN)
            ? tokens.read(TokenType.TEXT_BETWEEN)
            : tokens.nextIs(TokenType.TEXT_CLOSE)
            ? tokens.read(TokenType.TEXT_CLOSE)
            : undefined;
        if (close !== undefined) expressions.push(close);
        if (close === undefined || close.is(TokenType.TEXT_CLOSE)) break;
    } while (tokens.hasNext() && !tokens.nextHasMoreThanOneLineBreak());

    // Read an optional format.
    const format = tokens.nextIs(TokenType.LANGUAGE)
        ? parseLanguage(tokens)
        : undefined;

    return new Template(open, expressions, format);
}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): ListLiteral {
    let open = tokens.read(TokenType.LIST_OPEN);
    let values: Expression[] = [];
    let close;

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.LIST_CLOSE) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        values.push(parseExpression(tokens));

    close = tokens.readIf(TokenType.LIST_CLOSE);

    return new ListLiteral(open, values, close);
}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(TokenType.LIST_OPEN);
        const index = parseExpression(tokens);
        const close = tokens.readIf(TokenType.LIST_CLOSE);

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(TokenType.LIST_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } | {:} */
function parseSetOrMap(tokens: Tokens): MapLiteral | SetLiteral {
    let open = tokens.read(TokenType.SET_OPEN);
    const values: (Expression | KeyValue)[] = [];

    // Is this an empty map?
    if (tokens.nextAre(TokenType.BIND, TokenType.SET_CLOSE)) {
        const bind = tokens.read(TokenType.BIND);
        return new MapLiteral(open, [], bind, tokens.read(TokenType.SET_CLOSE));
    }

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.SET_CLOSE) &&
        !tokens.nextHasMoreThanOneLineBreak()
    ) {
        const key = parseExpression(tokens);
        if (tokens.nextIs(TokenType.BIND)) {
            const bind = tokens.read(TokenType.BIND);
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, value, bind));
        } else values.push(key);
    }

    const close = tokens.readIf(TokenType.SET_CLOSE);

    // Make a map
    return values.some((v): v is KeyValue => v instanceof KeyValue)
        ? new MapLiteral(open, values, undefined, close)
        : new SetLiteral(open, values as Expression[], close);
}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetOrMapAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(TokenType.SET_OPEN);
        const key = parseExpression(tokens);

        const close = tokens.nextIs(TokenType.SET_CLOSE)
            ? tokens.read(TokenType.SET_CLOSE)
            : undefined;

        left = new SetOrMapAccess(left, open, key, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (
        tokens.hasNext() &&
        tokens.nextIs(TokenType.SET_OPEN) &&
        !tokens.nextHasMoreThanOneLineBreak()
    );

    // Return the series of accesses and evaluations we created.
    return left;
}

/** PREVIOUS :: EXPRESSION @ EXPRESSION */
function parsePrevious(stream: Expression, tokens: Tokens): Previous {
    const previous = tokens.read(TokenType.PREVIOUS);
    const index = parseExpression(tokens);

    return new Previous(stream, previous, index);
}
/** TABLE :: ⎡ BIND* ⎦ ROWS* */
function parseTable(tokens: Tokens): TableLiteral {
    const type = parseTableType(tokens);

    // Read the rows.
    const rows = [];
    while (tokens.nextIs(TokenType.TABLE_OPEN)) rows.push(parseRow(tokens));

    return new TableLiteral(type, rows);
}

/** ROW :: ⎡ (BIND|EXPRESSION)* ⎦ */
function parseRow(tokens: Tokens): Row {
    const open = tokens.read(TokenType.TABLE_OPEN);

    const cells: (Bind | Expression)[] = [];
    // Read the cells.
    while (
        tokens.hasNext() &&
        !tokens.nextIs(TokenType.TABLE_CLOSE) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        cells.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    // Read the closing row marker.
    const close = tokens.readIf(TokenType.TABLE_CLOSE);

    return new Row(open, cells, close);
}

/** SELECT :: EXPRESSION |? ROW EXPRESSION */
function parseSelect(table: Expression, tokens: Tokens): Select {
    const select = tokens.read(TokenType.SELECT);
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Select(table, select, row, query);
}

/** INSERT :: EXPRESSION |+ ROW */
function parseInsert(table: Expression, tokens: Tokens): Insert {
    const insert = tokens.read(TokenType.INSERT);
    const row = parseRow(tokens);

    return new Insert(table, insert, row);
}

/** UPDATE :: EXPRESSION |: ROW EXPRESSION */
function parseUpdate(table: Expression, tokens: Tokens): Update {
    const update = tokens.read(TokenType.UPDATE);
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Update(table, update, row, query);
}

/** DELETE :: EXPRESSION |- EXPRESSION */
function parseDelete(table: Expression, tokens: Tokens): Delete {
    const del = tokens.read(TokenType.DELETE);
    const query = parseExpression(tokens);

    return new Delete(table, del, query);
}

/** STREAM :: EXPRESSION … EXPRESSION */
function parseReaction(
    condition: Expression,
    question: Token,
    initial: Expression,
    tokens: Tokens
): Reaction {
    const dots = tokens.read(TokenType.STREAM);
    const next = parseExpression(tokens);
    return new Reaction(condition, question, initial, dots, next);
}

/** FUNCTION :: DOCS? (ƒ | ALIASES) TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
export function parseFunction(tokens: Tokens): FunctionDefinition {
    const docs = parseDocs(tokens);

    const fun = tokens.read(TokenType.FUNCTION);

    const names = parseNames(tokens);

    const types = tokens.nextIs(TokenType.TYPE_OPEN)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.nextIs(TokenType.EVAL_OPEN)
        ? tokens.read(TokenType.EVAL_OPEN)
        : undefined;

    const inputs: Bind[] = [];
    while (tokens.nextIsnt(TokenType.EVAL_CLOSE) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));

    const close = tokens.nextIs(TokenType.EVAL_CLOSE)
        ? tokens.read(TokenType.EVAL_CLOSE)
        : undefined;

    let dot;
    let output;
    if (tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read(TokenType.TYPE);
        output = parseType(tokens);
    }

    const expression = tokens.nextIs(TokenType.PLACEHOLDER)
        ? tokens.read(TokenType.PLACEHOLDER)
        : !tokens.hasNext() || tokens.nextHasMoreThanOneLineBreak()
        ? undefined
        : parseExpression(tokens);

    return new FunctionDefinition(
        docs,
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
    const types = tokens.nextIs(TokenType.TYPE_OPEN)
        ? parseTypeInputs(tokens)
        : undefined;

    const open = tokens.read(TokenType.EVAL_OPEN);
    const inputs: Expression[] = [];

    // This little peek at space just prevents runaway parsing. It uses space to make an assumption that everything below isn't part of the evaluate.
    while (
        tokens.nextIsnt(TokenType.EVAL_CLOSE) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        inputs.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    let close = tokens.readIf(TokenType.EVAL_CLOSE);

    return new Evaluate(left, types, open, inputs, close);
}

/** CONVERSION :: DOCS? TYPE → TYPE EXPRESSION */
function parseConversion(tokens: Tokens): ConversionDefinition {
    const docs = parseDocs(tokens);
    const convert = tokens.read(TokenType.CONVERT);
    const input = parseType(tokens, true);
    const output = parseType(tokens, true);
    const expression = parseExpression(tokens);

    return new ConversionDefinition(docs, convert, input, output, expression);
}

/** CONVERT :: EXPRESSION → TYPE */
function parseConvert(expression: Expression, tokens: Tokens): Convert {
    const convert = tokens.read(TokenType.CONVERT);
    const type = parseType(tokens, true);

    return new Convert(expression, convert, type);
}

/** TYPE_VARS :: <NAMES*> */
function parseTypeVariables(tokens: Tokens): TypeVariables {
    const open = tokens.read(TokenType.TYPE_OPEN);
    const variables: TypeVariable[] = [];
    while (tokens.hasNext() && tokens.nextIs(TokenType.NAME))
        variables.push(new TypeVariable(parseNames(tokens)));
    const close = tokens.nextIs(TokenType.TYPE_CLOSE)
        ? tokens.read(TokenType.TYPE_CLOSE)
        : undefined;
    return new TypeVariables(open, variables, close);
}

function parseTypeInputs(tokens: Tokens): TypeInputs {
    const open = tokens.read(TokenType.TYPE_OPEN);
    const inputs: Type[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.TYPE_CLOSE) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        inputs.push(parseType(tokens));
    const close = tokens.readIf(TokenType.TYPE_CLOSE);
    return new TypeInputs(open, inputs, close);
}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parsePropertyReference(left: Expression, tokens: Tokens): Expression {
    if (!tokens.nextIs(TokenType.ACCESS)) return left;
    do {
        const access = tokens.read(TokenType.ACCESS);
        // See if there's a name, operator, or placeholder next, all of which are valid property names.
        // Note that we require it to be on the same line or the next line, but not later.
        let name;
        if (
            tokens.nextIsOneOf(
                TokenType.NAME,
                TokenType.PLACEHOLDER,
                TokenType.UNARY_OP,
                TokenType.BINARY_OP
            ) &&
            !tokens.nextHasMoreThanOneLineBreak()
        )
            name = tokens.nextIs(TokenType.NAME)
                ? tokens.read(TokenType.NAME)
                : tokens.nextIs(TokenType.PLACEHOLDER)
                ? tokens.read(TokenType.PLACEHOLDER)
                : tokens.nextIs(TokenType.UNARY_OP)
                ? tokens.read(TokenType.UNARY_OP)
                : tokens.read(TokenType.BINARY_OP);

        left = new PropertyReference(
            left,
            access,
            name ? new Reference(name) : undefined
        );

        // If there's a bind symbol next, then parse a PropertyBind
        if (
            left instanceof PropertyReference &&
            tokens.nextIs(TokenType.BIND)
        ) {
            const bind = tokens.read(TokenType.BIND);
            const value = parseExpression(tokens);

            left = new PropertyBind(left, bind, value);
        }

        // But wait, is it a function evaluation?
        if (
            tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE_OPEN) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(TokenType.ACCESS));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** TYPE :: (? | name | MEASUREMENT_TYPE | TEXT_TYPE | NONE_TYPE | LIST_TYPE | SET_TYPE | FUNCTION_TYPE | STREAM_TYPE) (| TYPE)* */
export function parseType(tokens: Tokens, isExpression: boolean = false): Type {
    let left: Type = tokens.nextIs(TokenType.PLACEHOLDER)
        ? new TypePlaceholder(tokens.read(TokenType.PLACEHOLDER))
        : tokens.nextIs(TokenType.NAME)
        ? parseNameType(tokens)
        : tokens.nextIs(TokenType.BOOLEAN_TYPE)
        ? new BooleanType(tokens.read(TokenType.BOOLEAN_TYPE))
        : tokens.nextIs(TokenType.BINARY_OP, '%') ||
          tokens.nextIsOneOf(TokenType.NUMBER, TokenType.NUMBER_TYPE)
        ? parseMeasurementType(tokens)
        : tokens.nextIs(TokenType.TEXT)
        ? parseTextType(tokens)
        : tokens.nextIs(TokenType.NONE)
        ? parseNoneType(tokens)
        : tokens.nextIs(TokenType.LIST_OPEN)
        ? parseListType(tokens)
        : tokens.nextIs(TokenType.SET_OPEN)
        ? parseSetOrMapType(tokens)
        : tokens.nextIs(TokenType.TABLE_OPEN)
        ? parseTableType(tokens)
        : tokens.nextIs(TokenType.FUNCTION)
        ? parseFunctionType(tokens)
        : tokens.nextIs(TokenType.STREAM)
        ? parseStreamType(tokens)
        : new UnparsableType(tokens.readLine());

    if (!isExpression && tokens.nextIs(TokenType.CONVERT))
        left = parseConversionType(left, tokens);

    while (tokens.nextIs(TokenType.UNION)) {
        const or = tokens.read(TokenType.UNION);
        left = new UnionType(left, or, parseType(tokens));
    }

    return left;
}

function parseNameType(tokens: Tokens): NameType {
    const name = tokens.read(TokenType.NAME);
    const types = tokens.nextIs(TokenType.TYPE_OPEN)
        ? parseTypeInputs(tokens)
        : undefined;
    return new NameType(name, types);
}

/** TEXT_TYPE :: TEXT LANGUAGE? */
function parseTextType(tokens: Tokens): TextType {
    const quote = tokens.read(TokenType.TEXT);
    const format = tokens.nextIs(TokenType.LANGUAGE)
        ? parseLanguage(tokens)
        : undefined;
    return new TextType(quote, format);
}

/** NUMBER_TYPE :: #NAME? */
function parseMeasurementType(tokens: Tokens): MeasurementType {
    if (tokens.nextIs(TokenType.BINARY_OP, '%'))
        return new MeasurementType(tokens.read(TokenType.BINARY_OP));

    const number = tokens.nextIs(TokenType.NUMBER)
        ? tokens.read(TokenType.NUMBER)
        : tokens.read(TokenType.NUMBER_TYPE);
    const unit =
        tokens.nextIsOneOf(
            TokenType.CONDITIONAL,
            TokenType.NAME,
            TokenType.LANGUAGE
        ) && tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new MeasurementType(number, unit);
}

/** NONE_TYPE :: !NAME? */
function parseNoneType(tokens: Tokens): NoneType {
    const none = tokens.read(TokenType.NONE_TYPE);
    return new NoneType(none);
}

/** STREAM_TYPE :: … TYPE */
function parseStreamType(tokens: Tokens): StreamType {
    const stream = tokens.read(TokenType.STREAM);
    const type = parseType(tokens);
    return new StreamType(stream, type);
}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType {
    const open = tokens.read(TokenType.LIST_OPEN);
    const type = tokens.nextIsnt(TokenType.LIST_CLOSE)
        ? parseType(tokens)
        : undefined;
    const close = tokens.nextIs(TokenType.LIST_CLOSE)
        ? tokens.read(TokenType.LIST_CLOSE)
        : undefined;
    return new ListType(open, type, close);
}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetOrMapType(tokens: Tokens): SetType | MapType {
    const open = tokens.read(TokenType.SET_OPEN);
    let key = undefined;
    let bind = undefined;
    let value = undefined;
    if (tokens.nextIsnt(TokenType.SET_CLOSE)) {
        if (!tokens.nextIs(TokenType.BIND)) key = parseType(tokens);
        bind = tokens.readIf(TokenType.BIND);
        value =
            bind !== undefined && !tokens.nextIs(TokenType.SET_CLOSE)
                ? parseType(tokens)
                : undefined;
    }
    const close = tokens.readIf(TokenType.SET_CLOSE);
    return bind === undefined
        ? new SetType(open, key, close)
        : new MapType(open, key, bind, value, close);
}

/** TABLE_TYPE :: (| BIND)+ | */
function parseTableType(tokens: Tokens): TableType {
    const open = tokens.read(TokenType.TABLE_OPEN);

    const columns: Bind[] = [];
    while (tokens.hasNext() && !tokens.nextIs(TokenType.TABLE_CLOSE)) {
        const bind = nextIsBind(tokens, false) ? parseBind(tokens) : undefined;
        if (bind === undefined) break;
        else columns.push(bind);
    }
    const close = tokens.readIf(TokenType.TABLE_CLOSE);
    return new TableType(open, columns, close);
}

/** FUNCTION_TYPE :: ƒ( BIND* ) TYPE */
function parseFunctionType(tokens: Tokens): FunctionType {
    const fun = tokens.read(TokenType.FUNCTION);

    const typeVars = tokens.nextIs(TokenType.TYPE_OPEN)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.readIf(TokenType.EVAL_OPEN);

    const inputs: Bind[] = [];
    while (nextIsBind(tokens, false)) inputs.push(parseBind(tokens));

    const close = tokens.readIf(TokenType.EVAL_CLOSE);

    const output = parseType(tokens);

    return new FunctionType(fun, typeVars, open, inputs, close, output);
}

/** CONVERSION_TYPE :: TYPE → TYPE */
function parseConversionType(left: Type, tokens: Tokens): ConversionType {
    const convert = tokens.read(TokenType.CONVERT);
    const to = parseType(tokens);

    return new ConversionType(left, convert, to);
}

/** CUSTOM_TYPE :: DOCS? •NAMES (•NAME)* TYPE_VARS ( BIND* ) BLOCK? */
export function parseStructure(tokens: Tokens): StructureDefinition {
    const docs = parseDocs(tokens);
    const type = tokens.read(TokenType.TYPE);
    const names = parseNames(tokens);

    const interfaces: Reference[] = [];
    while (tokens.nextIs(TokenType.NAME))
        interfaces.push(parseReference(tokens));

    const types = tokens.nextIs(TokenType.TYPE_OPEN)
        ? parseTypeVariables(tokens)
        : undefined;
    const open = tokens.nextIs(TokenType.EVAL_OPEN)
        ? tokens.read(TokenType.EVAL_OPEN)
        : undefined;
    const inputs: Bind[] = [];
    while (tokens.nextIsnt(TokenType.EVAL_CLOSE) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));
    const close = tokens.nextIs(TokenType.EVAL_CLOSE)
        ? tokens.read(TokenType.EVAL_CLOSE)
        : undefined;
    const block = nextAreOptionalDocsThen(tokens, TokenType.EVAL_OPEN)
        ? parseBlock(tokens, false, true)
        : undefined;

    return new StructureDefinition(
        docs,
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

function parseDocs(tokens: Tokens): Docs | undefined {
    const docs: Doc[] = [];
    while (
        tokens.nextIs(TokenType.DOC) &&
        (docs.length === 0 ||
            (tokens.peekSpace()?.split('\n').length ?? 0) - 1 <= 1)
    ) {
        docs.push(parseDoc(tokens));
    }
    return docs.length === 0 ? undefined : new Docs(docs);
}

export function parseDoc(tokens: Tokens): Doc {
    const open = tokens.read(TokenType.DOC);
    const content: Paragraph[] = [];

    while (tokens.nextIsnt(TokenType.DOC)) content.push(parseParagraph(tokens));

    const close = tokens.readIf(TokenType.DOC);
    const lang = tokens.nextIs(TokenType.LANGUAGE)
        ? parseLanguage(tokens)
        : undefined;
    return new Doc(open, content, close, lang);
}

export function parseTranslationDoc(doc: string) {
    return parseDoc(toTokens(DOCS_SYMBOL + doc + DOCS_SYMBOL));
}

function parseParagraph(tokens: Tokens): Paragraph {
    const content: Content[] = [];

    // Read until hitting two newlines or a closing doc symbol.
    while (tokens.hasNext() && tokens.nextIsnt(TokenType.DOC)) {
        content.push(
            tokens.nextIs(TokenType.TAG_OPEN)
                ? parseLink(tokens)
                : tokens.nextIs(TokenType.CONCEPT)
                ? parseConceptLink(tokens)
                : tokens.nextIs(TokenType.EVAL_OPEN)
                ? parseExample(tokens)
                : tokens.nextIsOneOf(
                      TokenType.WORDS,
                      TokenType.ITALIC,
                      TokenType.BOLD,
                      TokenType.EXTRA
                  )
                ? parseWords(tokens)
                : // Just read the token as a word, even though we don't know what it is.
                  new Words(undefined, tokens.read(), undefined)
        );

        // Stop if the content we just parsed has a Words with two or more line breaks.
        if (tokens.nextHasMoreThanOneLineBreak()) break;
    }

    return new Paragraph(content);
}

function parseLink(tokens: Tokens): WebLink {
    const open = tokens.read(TokenType.TAG_OPEN);
    const description = tokens.readIf(TokenType.WORDS);
    const at = tokens.readIf(TokenType.LINK);
    const url = tokens.readIf(TokenType.URL);
    const close = tokens.readIf(TokenType.TAG_CLOSE);

    return new WebLink(open, description, at, url, close);
}

function parseConceptLink(tokens: Tokens): ConceptLink {
    const concept = tokens.read(TokenType.CONCEPT);
    return new ConceptLink(concept);
}

function parseWords(tokens: Tokens): Words {
    // Read an optional format
    const open = tokens.nextIsOneOf(
        TokenType.ITALIC,
        TokenType.BOLD,
        TokenType.EXTRA
    )
        ? tokens.read()
        : undefined;

    // Read words
    const words = tokens.nextIs(TokenType.WORDS)
        ? tokens.read(TokenType.WORDS)
        : undefined;

    // Read closing format if it matches.
    const close =
        open && tokens.nextIs(open.getTypes()[0])
            ? tokens.read(open.getTypes()[0])
            : undefined;

    return new Words(open, words, close);
}

function parseExample(tokens: Tokens): Example {
    const open = tokens.read(TokenType.EVAL_OPEN);
    const program = parseProgram(tokens, true);
    const close = tokens.readIf(TokenType.EVAL_CLOSE);

    return new Example(open, program, close);
}
