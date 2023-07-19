import { tokenize } from './Tokenizer';
import { DOCS_SYMBOL, EXPONENT_SYMBOL, PRODUCT_SYMBOL } from './Symbols';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
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
import Template from '@nodes/Template';
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
        return (
            this.#unread.length > 0 && !this.#unread[0].isType(TokenType.End)
        );
    }

    nextIsEnd(): boolean {
        return this.#unread.length > 0 && this.#unread[0].isType(TokenType.End);
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: TokenType, text?: string): boolean {
        return (
            this.hasNext() &&
            this.peek()?.isType(type) === true &&
            (text === undefined || this.peekText() === text)
        );
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: TokenType): boolean {
        return this.hasNext() && this.peek()?.isntType(type) === true;
    }

    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: TokenType[]) {
        return types.every(
            (type, index) =>
                index < this.#unread.length && this.#unread[index].isType(type)
        );
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: TokenType): boolean {
        return (
            this.#read.length > 0 &&
            this.#read[this.#read.length - 1].isType(type)
        );
    }

    beforeNextLineIs(type: TokenType) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        while (index < this.#unread.length) {
            const token = this.#unread[index];
            if (index > 0 && this.#spaces.hasLineBreak(this.#unread[index]))
                break;
            if (token.isType(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return index < this.#unread.length && this.#unread[index].isType(type);
    }

    nextIsOneOf(...types: TokenType[]): boolean {
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
            !after.isType(TokenType.End) &&
            !this.#spaces.hasSpace(after)
        );
    }

    nextIsUnary(): boolean {
        return (
            this.nextIs(TokenType.Operator) && this.afterLacksPrecedingSpace()
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
    read(expectedType?: TokenType): Token {
        const next = this.#unread.shift();
        if (next !== undefined) {
            if (expectedType !== undefined && !next.isType(expectedType)) {
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
        } else return new Token('', TokenType.End);
    }

    readIf(type: TokenType) {
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
            this.nextIsnt(TokenType.ExampleClose)
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
export function parseProgram(tokens: Tokens, doc: boolean = false): Program {
    // If a borrow is next or there's no whitespace, parse a docs.
    const docs = parseDocs(tokens);

    const borrows = [];
    while (tokens.hasNext() && tokens.nextIs(TokenType.Borrow))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(tokens, BlockKind.Root, doc);

    // If the next token is the end, we're done! Otherwise, read all of the remaining
    // tokens and bundle them into an unparsable.
    const end = tokens.nextIsEnd()
        ? tokens.read(TokenType.End)
        : new Token('', TokenType.End);

    return new Program(docs, borrows, block, end);
}

// BORROW :: ↓ name number?
export function parseBorrow(tokens: Tokens): Borrow {
    const borrow = tokens.read(TokenType.Borrow);
    const source = tokens.readIf(TokenType.Name);
    const dot = tokens.readIf(TokenType.Access);
    const name =
        dot && tokens.nextIs(TokenType.Name)
            ? tokens.read(TokenType.Name)
            : undefined;
    const version =
        tokens.nextIs(TokenType.Number) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(TokenType.Number)
            : undefined;

    return new Borrow(borrow, source, dot, name, version);
}

/** BLOCK :: DOCS ? ( [BIND|EXPRESSION]+ )  */
export function parseBlock(
    tokens: Tokens,
    kind: BlockKind = BlockKind.Block,
    doc: boolean = false
): Block {
    const root = kind === BlockKind.Root;

    // Grab any documentation if this isn't a root.
    let docs = root ? undefined : parseDocs(tokens);

    const open = root
        ? undefined
        : tokens.nextIs(TokenType.EvalOpen)
        ? tokens.read(TokenType.EvalOpen)
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
            (!root && !doc && tokens.nextIsnt(TokenType.EvalClose)) ||
            (doc && tokens.nextIsnt(TokenType.ExampleClose)))
    )
        statements.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens, true)
        );

    const close = root
        ? undefined
        : tokens.nextIs(TokenType.EvalClose)
        ? tokens.read(TokenType.EvalClose)
        : undefined;

    return new Block(statements, kind, open, close, docs);
}

function nextAreOptionalDocsThen(tokens: Tokens, types: TokenType[]): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    // We don't actually care what the docs are or if there are any.
    parseDocs(tokens);

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

    if (tokens.nextIs(TokenType.TypeOpen)) parseTypeInputs(tokens);

    const nextIsEval = tokens.nextIs(TokenType.EvalOpen);

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
        (!expectValue || bind.hasValue() || bind.names.hasLanguage())
    );
}

/** BIND :: NAMES TYPE? (: EXPRESSION)? */
export function parseBind(tokens: Tokens): Bind {
    let docs = parseDocs(tokens);
    const share = tokens.readIf(TokenType.Share);
    const names = parseNames(tokens);
    const etc = tokens.readIf(TokenType.Etc);
    let colon;
    let value;
    let dot;
    let type;

    if (tokens.nextIs(TokenType.Type)) {
        dot = tokens.read(TokenType.Type);
        type = parseType(tokens);
    }

    if (tokens.nextIs(TokenType.Bind)) {
        colon = tokens.read(TokenType.Bind);
        value = parseExpression(tokens);
    }

    return new Bind(docs, share, names, etc, dot, type, colon, value);
}

/** NAMES :: (name LANGUAGE?)+ */
export function parseNames(tokens: Tokens): Names {
    const names: Name[] = [];

    while (
        (tokens.hasNext() &&
            names.length > 0 &&
            tokens.nextIs(TokenType.Separator)) ||
        (names.length === 0 &&
            tokens.nextIsOneOf(
                TokenType.Name,
                TokenType.Placeholder,
                TokenType.Operator
            ))
    ) {
        const comma = tokens.nextIs(TokenType.Separator)
            ? tokens.read(TokenType.Separator)
            : undefined;
        if (names.length > 0 && comma === undefined) break;
        const name = tokens.nextIs(TokenType.Name)
            ? tokens.read(TokenType.Name)
            : tokens.nextIs(TokenType.Placeholder)
            ? tokens.read(TokenType.Placeholder)
            : tokens.nextIs(TokenType.Operator)
            ? tokens.read(TokenType.Operator)
            : undefined;
        const lang = tokens.nextIs(TokenType.Language)
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
    const slash = tokens.read(TokenType.Language);
    const lang =
        tokens.nextIs(TokenType.Name) && !tokens.nextHasPrecedingLineBreak()
            ? tokens.read(TokenType.Name)
            : undefined;
    return new Language(slash, lang);
}

/** EXPRESSION :: BINARY_OPERATION [ conditional EXPRESSION EXPRESSION ]? */
export function parseExpression(
    tokens: Tokens,
    expectSpace: boolean = false,
    allowReaction: boolean = true
): Expression {
    // If the next token has more than one preceding line break, just return an unparsable.
    // This prevents runaway expressions and provides an opportunity to provide feedback precisely
    // where the expression was expected.
    if (!expectSpace && tokens.nextHasMoreThanOneLineBreak())
        return new UnparsableExpression([]);

    let left = parseBinaryEvaluate(tokens);

    // Is it conditional statement?
    if (tokens.nextIs(TokenType.Conditional))
        left = parseConditional(left, tokens);

    // Is it a reaction?
    if (tokens.nextIs(TokenType.Stream) && allowReaction)
        left = parseReaction(left, tokens);

    // Return whatever expression we got
    return left;
}

export function parseConditional(
    condition: Expression,
    tokens: Tokens
): Conditional {
    const question = tokens.read(TokenType.Conditional);
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
        (tokens.nextIs(TokenType.Operator) ||
            (tokens.nextIs(TokenType.TypeOperator) &&
                !tokens.nextHasPrecedingLineBreak()))
    ) {
        left = tokens.nextIs(TokenType.TypeOperator)
            ? new Is(
                  left,
                  tokens.read(TokenType.TypeOperator),
                  parseType(tokens)
              )
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
        tokens.nextIs(TokenType.This)
            ? new This(tokens.read(TokenType.This))
            : // Placeholder
            tokens.nextIs(TokenType.Placeholder)
            ? parsePlaceholder(tokens)
            : // Start
            tokens.nextIs(TokenType.Initial)
            ? parseInitial(tokens)
            : // Change
            tokens.nextIs(TokenType.Change)
            ? parseChanged(tokens)
            : // Nones
            tokens.nextIs(TokenType.None)
            ? parseNone(tokens)
            : // Unary expressions before names and binary operators, since some unary can be multiple.
            tokens.nextIsUnary()
            ? new UnaryEvaluate(
                  parseReference(tokens),
                  parseAtomicExpression(tokens)
              )
            : // References can be names or binary operators
            tokens.nextIsOneOf(TokenType.Name, TokenType.Operator)
            ? parseReference(tokens)
            : // Booleans
            tokens.nextIs(TokenType.Boolean)
            ? new BooleanLiteral(tokens.read(TokenType.Boolean))
            : // Numbers with units
            tokens.nextIs(TokenType.Number)
            ? parseNumber(tokens)
            : // Text with optional formats
            tokens.nextIs(TokenType.Text)
            ? parseText(tokens)
            : // A string template
            tokens.nextIs(TokenType.TemplateOpen)
            ? parseTemplate(tokens)
            : // A list
            tokens.nextIs(TokenType.ListOpen)
            ? parseList(tokens)
            : // A set or map
            tokens.nextIs(TokenType.SetOpen)
            ? parseSetOrMap(tokens)
            : // Table literals
            tokens.nextIs(TokenType.TableOpen)
            ? parseTable(tokens)
            : // A block expression
            nextAreOptionalDocsThen(tokens, [TokenType.EvalOpen])
            ? parseBlock(tokens, BlockKind.Block)
            : // A structure definition
            nextAreOptionalDocsThen(tokens, [TokenType.Type]) ||
              nextAreOptionalDocsThen(tokens, [TokenType.Share, TokenType.Type])
            ? parseStructure(tokens)
            : // A function function
            nextAreOptionalDocsThen(tokens, [TokenType.Function]) ||
              nextAreOptionalDocsThen(tokens, [
                  TokenType.Share,
                  TokenType.Function,
              ])
            ? parseFunction(tokens)
            : // A conversion function.
            nextAreOptionalDocsThen(tokens, [TokenType.Convert])
            ? parseConversion(tokens)
            : // A documented expression
            tokens.nextIs(TokenType.Doc)
            ? parseDocumentedExpression(tokens)
            : // Unknown expression
              new UnparsableExpression(tokens.readLine());

    // But wait! Is it one or more infix expressions? Slurp them up.
    while (true) {
        if (tokens.nextIs(TokenType.Access))
            left = parsePropertyReference(left, tokens);
        else if (
            tokens.nextIs(TokenType.ListOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseListAccess(left, tokens);
        else if (
            tokens.nextIs(TokenType.SetOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseSetOrMapAccess(left, tokens);
        else if (tokens.nextIs(TokenType.Previous))
            left = parsePrevious(left, tokens);
        else if (nextIsEvaluate(tokens)) left = parseEvaluate(left, tokens);
        else if (tokens.nextIs(TokenType.Convert))
            left = parseConvert(left, tokens);
        else if (tokens.nextIs(TokenType.Select))
            left = parseSelect(left, tokens);
        else if (tokens.nextIs(TokenType.Insert))
            left = parseInsert(left, tokens);
        else if (tokens.nextIs(TokenType.Update))
            left = parseUpdate(left, tokens);
        else if (tokens.nextIs(TokenType.Delete))
            left = parseDelete(left, tokens);
        else break;
    }
    return left;
}

function parsePlaceholder(tokens: Tokens): ExpressionPlaceholder {
    const placeholder = tokens.read(TokenType.Placeholder);

    let dot;
    let type;
    if (tokens.nextIs(TokenType.Type)) {
        dot = tokens.read(TokenType.Type);
        type = parseType(tokens);
    }

    return new ExpressionPlaceholder(placeholder, dot, type);
}

function parseInitial(tokens: Tokens): Initial {
    const diamond = tokens.read(TokenType.Initial);
    return new Initial(diamond);
}

function parseReference(tokens: Tokens): Reference {
    const name = tokens.read(
        tokens.nextIs(TokenType.Operator) ? TokenType.Operator : TokenType.Name
    );

    return new Reference(name);
}

function parseChanged(tokens: Tokens): Changed {
    const change = tokens.read(TokenType.Change);
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
    const error = tokens.read(TokenType.None);
    return new NoneLiteral(error);
}

/** NUMBER :: number name? */
export function parseNumber(tokens: Tokens): NumberLiteral {
    const number = tokens.read(TokenType.Number);
    const unit =
        tokens.nextIsOneOf(TokenType.Name, TokenType.Language) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberLiteral(number, unit ?? Unit.Empty);
}

/** UNIT :: DIMENSION (·DIMENSION)* (/ DIMENSION (·DIMENSION*))? */
function parseUnit(tokens: Tokens): Unit {
    // Parse a wildcard unit.
    if (tokens.nextIs(TokenType.Conditional)) {
        return new Unit(
            undefined,
            [
                new Dimension(
                    undefined,
                    tokens.read(TokenType.Conditional),
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
        (tokens.nextIs(TokenType.Name) ||
            tokens.nextIs(TokenType.Operator, PRODUCT_SYMBOL)) &&
        tokens.nextLacksPrecedingSpace()
    )
        numerator.push(parseDimension(tokens));

    let slash = undefined;
    const denominator: Dimension[] = [];
    if (tokens.nextIs(TokenType.Language)) {
        slash = tokens.read(TokenType.Language);
        while (
            (tokens.nextIs(TokenType.Name) ||
                tokens.nextIs(TokenType.Operator, PRODUCT_SYMBOL)) &&
            tokens.nextLacksPrecedingSpace()
        )
            denominator.push(parseDimension(tokens));
    }

    return new Unit(undefined, numerator, slash, denominator);
}

/** DIMENSION :: NAME (^NUMBER)? */
function parseDimension(tokens: Tokens): Dimension {
    const product = tokens.nextIs(TokenType.Operator, PRODUCT_SYMBOL)
        ? tokens.read(TokenType.Operator)
        : undefined;
    const name = tokens.read(TokenType.Name);
    let caret = undefined;
    let exponent = undefined;
    if (
        tokens.nextIs(TokenType.Operator, EXPONENT_SYMBOL) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        caret = tokens.read(TokenType.Operator);
        exponent =
            tokens.nextIs(TokenType.Number) && tokens.nextLacksPrecedingSpace()
                ? tokens.read(TokenType.Number)
                : undefined;
    }
    return new Dimension(product, name, caret, exponent);
}

/** TEXT :: text name? */
function parseText(tokens: Tokens): TextLiteral {
    const text = tokens.read(TokenType.Text);
    const format = tokens.nextIs(TokenType.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new TextLiteral(text, format);
}

/** TEMPLATE :: text_open ( EXPRESSION text_between )* EXPRESSION text_close name? */
function parseTemplate(tokens: Tokens): Template {
    const open = tokens.read(TokenType.TemplateOpen);
    const expressions: (Expression | Token)[] = [];

    do {
        expressions.push(parseExpression(tokens));
        const close = tokens.nextIs(TokenType.TemplateBetween)
            ? tokens.read(TokenType.TemplateBetween)
            : tokens.nextIs(TokenType.TemplateClose)
            ? tokens.read(TokenType.TemplateClose)
            : undefined;
        if (close !== undefined) expressions.push(close);
        if (close === undefined || close.isType(TokenType.TemplateClose)) break;
    } while (
        tokens.hasNext() &&
        !tokens.nextHasMoreThanOneLineBreak() &&
        tokens.nextIsnt(TokenType.ExampleClose)
    );

    // Read an optional format.
    const format = tokens.nextIs(TokenType.Language)
        ? parseLanguage(tokens)
        : undefined;

    return new Template(open, expressions, format);
}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): ListLiteral {
    let open = tokens.read(TokenType.ListOpen);
    let values: Expression[] = [];
    let close;

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.ListClose) &&
        tokens.nextIsnt(TokenType.ExampleClose) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        values.push(parseExpression(tokens));

    close = tokens.readIf(TokenType.ListClose);

    return new ListLiteral(open, values, close);
}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(TokenType.ListOpen);
        const index = parseExpression(tokens);
        const close = tokens.readIf(TokenType.ListClose);

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(TokenType.ListOpen));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } | {:} */
function parseSetOrMap(tokens: Tokens): MapLiteral | SetLiteral {
    let open = tokens.read(TokenType.SetOpen);
    const values: (Expression | KeyValue)[] = [];

    // Is this an empty map?
    if (tokens.nextAre(TokenType.Bind, TokenType.SetClose)) {
        const bind = tokens.read(TokenType.Bind);
        return new MapLiteral(open, [], bind, tokens.read(TokenType.SetClose));
    }

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.SetClose) &&
        tokens.nextIsnt(TokenType.ExampleClose) &&
        !tokens.nextHasMoreThanOneLineBreak()
    ) {
        const key = parseExpression(tokens);
        if (tokens.nextIs(TokenType.Bind)) {
            const bind = tokens.read(TokenType.Bind);
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, value, bind));
        } else values.push(key);
    }

    const close = tokens.readIf(TokenType.SetClose);

    // Make a map
    return values.some((v): v is KeyValue => v instanceof KeyValue)
        ? new MapLiteral(open, values, undefined, close)
        : new SetLiteral(open, values as Expression[], close);
}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetOrMapAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(TokenType.SetOpen);
        const key = parseExpression(tokens);

        const close = tokens.nextIs(TokenType.SetClose)
            ? tokens.read(TokenType.SetClose)
            : undefined;

        left = new SetOrMapAccess(left, open, key, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (
        tokens.hasNext() &&
        tokens.nextIs(TokenType.SetOpen) &&
        !tokens.nextHasMoreThanOneLineBreak()
    );

    // Return the series of accesses and evaluations we created.
    return left;
}

/** PREVIOUS :: EXPRESSION @ EXPRESSION */
function parsePrevious(stream: Expression, tokens: Tokens): Previous {
    const previous = tokens.read(TokenType.Previous);
    const index = parseExpression(tokens);

    return new Previous(stream, previous, index);
}
/** TABLE :: ⎡ BIND* ⎦ ROWS* */
function parseTable(tokens: Tokens): TableLiteral {
    const type = parseTableType(tokens);

    // Read the rows.
    const rows = [];
    while (tokens.nextIs(TokenType.TableOpen)) rows.push(parseRow(tokens));

    return new TableLiteral(type, rows);
}

/** ROW :: ⎡ (BIND|EXPRESSION)* ⎦ */
function parseRow(tokens: Tokens): Row {
    const open = tokens.read(TokenType.TableOpen);

    const cells: (Bind | Expression)[] = [];
    // Read the cells.
    while (
        tokens.hasNext() &&
        !tokens.nextIs(TokenType.TableClose) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        cells.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    // Read the closing row marker.
    const close = tokens.readIf(TokenType.TableClose);

    return new Row(open, cells, close);
}

/** SELECT :: EXPRESSION |? ROW EXPRESSION */
function parseSelect(table: Expression, tokens: Tokens): Select {
    const select = tokens.read(TokenType.Select);
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Select(table, select, row, query);
}

/** INSERT :: EXPRESSION |+ ROW */
function parseInsert(table: Expression, tokens: Tokens): Insert {
    const insert = tokens.read(TokenType.Insert);
    const row = parseRow(tokens);

    return new Insert(table, insert, row);
}

/** UPDATE :: EXPRESSION |: ROW EXPRESSION */
function parseUpdate(table: Expression, tokens: Tokens): Update {
    const update = tokens.read(TokenType.Update);
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Update(table, update, row, query);
}

/** DELETE :: EXPRESSION |- EXPRESSION */
function parseDelete(table: Expression, tokens: Tokens): Delete {
    const del = tokens.read(TokenType.Delete);
    const query = parseExpression(tokens);

    return new Delete(table, del, query);
}

/** STREAM :: EXPRESSION … EXPRESSION */
function parseReaction(initial: Expression, tokens: Tokens): Reaction {
    const dots = tokens.read(TokenType.Stream);
    const condition = parseExpression(tokens, false, false);
    const nextdots = tokens.nextIs(TokenType.Stream)
        ? tokens.read(TokenType.Stream)
        : undefined;
    const next = parseExpression(tokens, false, false);
    return new Reaction(initial, dots, condition, nextdots, next);
}

/** FUNCTION :: DOCS? (ƒ | ALIASES) TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
export function parseFunction(tokens: Tokens): FunctionDefinition {
    const docs = parseDocs(tokens);
    const share = tokens.nextIs(TokenType.Share)
        ? tokens.read(TokenType.Share)
        : undefined;

    const fun = tokens.read(TokenType.Function);
    const names = parseNames(tokens);

    const types = tokens.nextIs(TokenType.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.nextIs(TokenType.EvalOpen)
        ? tokens.read(TokenType.EvalOpen)
        : undefined;

    const inputs: Bind[] = [];
    while (tokens.nextIsnt(TokenType.EvalClose) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));

    const close = tokens.nextIs(TokenType.EvalClose)
        ? tokens.read(TokenType.EvalClose)
        : undefined;

    let dot;
    let output;
    if (tokens.nextIs(TokenType.Type)) {
        dot = tokens.read(TokenType.Type);
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
    const types = tokens.nextIs(TokenType.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;

    const open = tokens.read(TokenType.EvalOpen);
    const inputs: Expression[] = [];

    // This little peek at space just prevents runaway parsing. It uses space to make an assumption that everything below isn't part of the evaluate.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.ExampleClose) &&
        tokens.nextIsnt(TokenType.EvalClose) &&
        !tokens.nextHasMoreThanOneLineBreak()
    )
        inputs.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    let close = tokens.readIf(TokenType.EvalClose);

    return new Evaluate(left, types, open, inputs, close);
}

/** CONVERSION :: DOCS? TYPE → TYPE EXPRESSION */
function parseConversion(tokens: Tokens): ConversionDefinition {
    const docs = parseDocs(tokens);
    const convert = tokens.read(TokenType.Convert);
    const input = parseType(tokens, true);
    const output = parseType(tokens, true);
    const expression = parseExpression(tokens);

    return new ConversionDefinition(docs, convert, input, output, expression);
}

/** CONVERT :: EXPRESSION → TYPE */
function parseConvert(expression: Expression, tokens: Tokens): Convert {
    const convert = tokens.read(TokenType.Convert);
    const type = parseType(tokens, true);

    return new Convert(expression, convert, type);
}

/** TYPE_VARS :: <NAMES*> */
function parseTypeVariables(tokens: Tokens): TypeVariables {
    const open = tokens.read(TokenType.TypeOpen);
    const variables: TypeVariable[] = [];
    while (tokens.hasNext() && tokens.nextIs(TokenType.Name))
        variables.push(new TypeVariable(parseNames(tokens)));
    const close = tokens.nextIs(TokenType.TypeClose)
        ? tokens.read(TokenType.TypeClose)
        : undefined;
    return new TypeVariables(open, variables, close);
}

function parseTypeInputs(tokens: Tokens): TypeInputs {
    const open = tokens.read(TokenType.TypeOpen);
    const inputs: Type[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.TypeClose) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        inputs.push(parseType(tokens));
    const close = tokens.readIf(TokenType.TypeClose);
    return new TypeInputs(open, inputs, close);
}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parsePropertyReference(left: Expression, tokens: Tokens): Expression {
    if (!tokens.nextIs(TokenType.Access)) return left;
    do {
        const access = tokens.read(TokenType.Access);
        // See if there's a name, operator, or placeholder next, all of which are valid property names.
        // Note that we require it to be on the same line or the next line, but not later.
        let name;
        if (
            tokens.nextIsOneOf(
                TokenType.Name,
                TokenType.Placeholder,
                TokenType.Operator
            ) &&
            !tokens.nextHasMoreThanOneLineBreak()
        )
            name = tokens.read();

        left = new PropertyReference(
            left,
            access,
            name ? new Reference(name) : undefined
        );

        // If there's a bind symbol next, then parse a PropertyBind
        if (
            left instanceof PropertyReference &&
            tokens.nextIs(TokenType.Bind)
        ) {
            const bind = tokens.read(TokenType.Bind);
            const value = parseExpression(tokens);

            left = new PropertyBind(left, bind, value);
        }

        // But wait, is it a function evaluation?
        if (
            tokens.nextIsOneOf(TokenType.EvalOpen, TokenType.TypeOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(TokenType.Access));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** TYPE :: (? | name | MEASUREMENT_TYPE | TEXT_TYPE | NONE_TYPE | LIST_TYPE | SET_TYPE | FUNCTION_TYPE | STREAM_TYPE) (| TYPE)* */
export function parseType(tokens: Tokens, isExpression: boolean = false): Type {
    let left: Type = tokens.nextIs(TokenType.Placeholder)
        ? new TypePlaceholder(tokens.read(TokenType.Placeholder))
        : tokens.nextIs(TokenType.Name)
        ? parseNameType(tokens)
        : tokens.nextIs(TokenType.BooleanType)
        ? new BooleanType(tokens.read(TokenType.BooleanType))
        : tokens.nextIs(TokenType.Operator, '%') ||
          tokens.nextIsOneOf(TokenType.Number, TokenType.NumberType)
        ? parseNumberType(tokens)
        : tokens.nextIs(TokenType.Text)
        ? parseTextType(tokens)
        : tokens.nextIs(TokenType.None)
        ? parseNoneType(tokens)
        : tokens.nextIs(TokenType.ListOpen)
        ? parseListType(tokens)
        : tokens.nextIs(TokenType.SetOpen)
        ? parseSetOrMapType(tokens)
        : tokens.nextIs(TokenType.TableOpen)
        ? parseTableType(tokens)
        : tokens.nextIs(TokenType.Function)
        ? parseFunctionType(tokens)
        : tokens.nextIs(TokenType.Stream)
        ? parseStreamType(tokens)
        : new UnparsableType(tokens.readLine());

    if (!isExpression && tokens.nextIs(TokenType.Convert))
        left = parseConversionType(left, tokens);

    while (tokens.nextIs(TokenType.Union)) {
        const or = tokens.read(TokenType.Union);
        left = new UnionType(left, or, parseType(tokens));
    }

    return left;
}

function parseNameType(tokens: Tokens): NameType {
    const name = tokens.read(TokenType.Name);
    const types = tokens.nextIs(TokenType.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;
    return new NameType(name, types);
}

/** TEXT_TYPE :: TEXT LANGUAGE? */
function parseTextType(tokens: Tokens): TextType {
    const quote = tokens.read(TokenType.Text);
    const format = tokens.nextIs(TokenType.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new TextType(quote, format);
}

/** NUMBER_TYPE :: #NAME? */
function parseNumberType(tokens: Tokens): NumberType {
    if (tokens.nextIs(TokenType.Operator, '%'))
        return new NumberType(tokens.read(TokenType.Operator));

    const number = tokens.nextIs(TokenType.Number)
        ? tokens.read(TokenType.Number)
        : tokens.read(TokenType.NumberType);
    const unit =
        tokens.nextIsOneOf(
            TokenType.Conditional,
            TokenType.Name,
            TokenType.Language
        ) && tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberType(number, unit);
}

/** NONE_TYPE :: !NAME? */
function parseNoneType(tokens: Tokens): NoneType {
    const none = tokens.read(TokenType.None);
    return new NoneType(none);
}

/** STREAM_TYPE :: … TYPE */
function parseStreamType(tokens: Tokens): StreamType {
    const stream = tokens.read(TokenType.Stream);
    const type = parseType(tokens);
    return new StreamType(stream, type);
}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType {
    const open = tokens.read(TokenType.ListOpen);
    const type = tokens.nextIsnt(TokenType.ListClose)
        ? parseType(tokens)
        : undefined;
    const close = tokens.nextIs(TokenType.ListClose)
        ? tokens.read(TokenType.ListClose)
        : undefined;
    return new ListType(open, type, close);
}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetOrMapType(tokens: Tokens): SetType | MapType {
    const open = tokens.read(TokenType.SetOpen);
    let key = undefined;
    let bind = undefined;
    let value = undefined;
    if (tokens.nextIsnt(TokenType.SetClose)) {
        if (!tokens.nextIs(TokenType.Bind)) key = parseType(tokens);
        bind = tokens.readIf(TokenType.Bind);
        value =
            bind !== undefined && !tokens.nextIs(TokenType.SetClose)
                ? parseType(tokens)
                : undefined;
    }
    const close = tokens.readIf(TokenType.SetClose);
    return bind === undefined
        ? new SetType(open, key, close)
        : new MapType(open, key, bind, value, close);
}

/** TABLE_TYPE :: (| BIND)+ | */
function parseTableType(tokens: Tokens): TableType {
    const open = tokens.read(TokenType.TableOpen);

    const columns: Bind[] = [];
    while (tokens.hasNext() && !tokens.nextIs(TokenType.TableClose)) {
        const bind = nextIsBind(tokens, false) ? parseBind(tokens) : undefined;
        if (bind === undefined) break;
        else columns.push(bind);
    }
    const close = tokens.readIf(TokenType.TableClose);
    return new TableType(open, columns, close);
}

/** FUNCTION_TYPE :: ƒ( BIND* ) TYPE */
function parseFunctionType(tokens: Tokens): FunctionType {
    const fun = tokens.read(TokenType.Function);

    const typeVars = tokens.nextIs(TokenType.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.readIf(TokenType.EvalOpen);

    const inputs: Bind[] = [];
    while (nextIsBind(tokens, false)) inputs.push(parseBind(tokens));

    const close = tokens.readIf(TokenType.EvalClose);

    const output = parseType(tokens);

    return new FunctionType(fun, typeVars, open, inputs, close, output);
}

/** CONVERSION_TYPE :: TYPE → TYPE */
function parseConversionType(left: Type, tokens: Tokens): ConversionType {
    const convert = tokens.read(TokenType.Convert);
    const to = parseType(tokens);

    return new ConversionType(left, convert, to);
}

/** CUSTOM_TYPE :: DOCS? •NAMES (•NAME)* TYPE_VARS ( BIND* ) BLOCK? */
export function parseStructure(tokens: Tokens): StructureDefinition {
    const docs = parseDocs(tokens);
    const share = tokens.nextIs(TokenType.Share)
        ? tokens.read(TokenType.Share)
        : undefined;

    const type = tokens.read(TokenType.Type);
    const names = parseNames(tokens);

    const interfaces: Reference[] = [];
    while (tokens.nextIs(TokenType.Name))
        interfaces.push(parseReference(tokens));

    const types = tokens.nextIs(TokenType.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;
    const open = tokens.nextIs(TokenType.EvalOpen)
        ? tokens.read(TokenType.EvalOpen)
        : undefined;
    const inputs: Bind[] = [];
    while (tokens.nextIsnt(TokenType.EvalClose) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));
    const close = tokens.nextIs(TokenType.EvalClose)
        ? tokens.read(TokenType.EvalClose)
        : undefined;
    const block = nextAreOptionalDocsThen(tokens, [TokenType.EvalOpen])
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

function parseDocs(tokens: Tokens): Docs | undefined {
    const docs: Doc[] = [];
    while (
        tokens.nextIs(TokenType.Doc) &&
        (docs.length === 0 ||
            (tokens.peekSpace()?.split('\n').length ?? 0) - 1 <= 1)
    ) {
        docs.push(parseDoc(tokens));
    }
    return docs.length === 0 ? undefined : new Docs(docs);
}

export function parseDoc(tokens: Tokens): Doc {
    const open = tokens.read(TokenType.Doc);
    const content = parseMarkup(tokens);

    const close = tokens.readIf(TokenType.Doc);
    const lang = tokens.nextIs(TokenType.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new Doc(open, content, close, lang);
}

function nextIsContent(tokens: Tokens) {
    return tokens.nextIsOneOf(
        TokenType.Words,
        TokenType.TagOpen,
        TokenType.Concept,
        TokenType.ExampleOpen,
        TokenType.Mention,
        TokenType.Italic,
        TokenType.Bold,
        TokenType.Underline,
        TokenType.Extra
    );
}

export function parseMarkup(tokens: Tokens): Markup {
    const content: Paragraph[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.Doc) &&
        tokens.nextIsnt(TokenType.ExampleClose) &&
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
        tokens.nextIsnt(TokenType.Doc) &&
        nextIsContent(tokens)
    ) {
        content.push(parseSegment(tokens));
        if (tokens.nextHasMoreThanOneLineBreak()) break;
    }

    return new Paragraph(content);
}

function parseSegment(tokens: Tokens) {
    return tokens.nextIs(TokenType.Words)
        ? tokens.read(TokenType.Words)
        : tokens.nextIs(TokenType.TagOpen)
        ? parseWebLink(tokens)
        : tokens.nextIs(TokenType.Concept)
        ? parseConceptLink(tokens)
        : tokens.nextIs(TokenType.ExampleOpen)
        ? parseExample(tokens)
        : tokens.nextIs(TokenType.Mention)
        ? parseMention(tokens)
        : parseWords(tokens);
}

function parseWebLink(tokens: Tokens): WebLink {
    const open = tokens.read(TokenType.TagOpen);
    const description = tokens.readIf(TokenType.Words);
    const at = tokens.readIf(TokenType.Link);
    const url = tokens.readIf(TokenType.URL);
    const close = tokens.readIf(TokenType.TagClose);

    return new WebLink(open, description, at, url, close);
}

function parseConceptLink(tokens: Tokens): ConceptLink {
    const concept = tokens.read(TokenType.Concept);
    return new ConceptLink(concept);
}

const FORMATS = [
    TokenType.Italic,
    TokenType.Underline,
    TokenType.Bold,
    TokenType.Extra,
];

function parseWords(tokens: Tokens): Words {
    // Read an optional format
    const open = tokens.nextIsOneOf(...FORMATS) ? tokens.read() : undefined;

    // Figure out what token type it is.
    let format: TokenType | undefined = undefined;
    if (open !== undefined) {
        const types = new Set(FORMATS);
        const intersection = open.types.filter((type) => types.has(type));
        if (intersection.length > 0) format = intersection[0];
    }

    // Read segments until reaching the matching closing format or the end of the paragraph or the end of the doc or there are no more tokens.
    const segments: Segment[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(TokenType.Doc) &&
        (format === undefined || !tokens.nextIs(format)) &&
        nextIsContent(tokens)
    ) {
        segments.push(
            tokens.nextIs(TokenType.Words)
                ? tokens.read(TokenType.Words)
                : parseSegment(tokens)
        );
        if (tokens.nextHasMoreThanOneLineBreak()) break;
    }

    // Read closing format if it matches.
    const close = format && tokens.nextIs(format) ? tokens.read() : undefined;

    return new Words(open, segments, close);
}

function parseExample(tokens: Tokens): Example {
    const open = tokens.read(TokenType.ExampleOpen);
    const program = parseProgram(tokens, true);
    const close = tokens.readIf(TokenType.ExampleClose);

    return new Example(open, program, close);
}

function parseMention(tokens: Tokens): Mention | Branch {
    const name = tokens.read();
    const mention = new Mention(name);

    if (tokens.nextIs(TokenType.ListOpen)) return parseBranch(mention, tokens);
    else return mention;
}

function parseBranch(mention: Mention, tokens: Tokens): Branch {
    const open = tokens.read(TokenType.ListOpen);
    const yes = parseWords(tokens);
    const bar = tokens.read(TokenType.Union);
    const no = parseWords(tokens);
    const close = tokens.read(TokenType.ListClose);
    return new Branch(mention, open, yes, bar, no, close);
}
