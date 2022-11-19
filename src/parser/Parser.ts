import { EXPONENT_SYMBOL, tokenize } from "./Tokenizer";
import Node from "../nodes/Node";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import type Expression from "../nodes/Expression";
import type Type from "../nodes/Type";
import Program from "../nodes/Program";
import Borrow from "../nodes/Borrow";
import Unparsable from "../nodes/Unparsable";
import Block from "../nodes/Block";
import ListLiteral from "../nodes/ListLiteral";
import Bind from "../nodes/Bind";
import Evaluate from "../nodes/Evaluate";
import UnaryOperation from "../nodes/UnaryOperation";
import BinaryOperation from "../nodes/BinaryOperation";
import PropertyReference from "../nodes/PropertyReference";
import FunctionDefinition from "../nodes/FunctionDefinition";
import Template from "../nodes/Template";
import UnionType from "../nodes/UnionType";
import NoneLiteral from "../nodes/NoneLiteral";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import TextLiteral from "../nodes/TextLiteral";
import NameType from "../nodes/NameType";
import NoneType from "../nodes/NoneType";
import TextType from "../nodes/TextType";
import ListType from "../nodes/ListType";
import FunctionType from "../nodes/FunctionType";
import TypeVariable from "../nodes/TypeVariable";
import KeyValue from "../nodes/KeyValue";
import ListAccess from "../nodes/ListAccess";
import Conditional from "../nodes/Conditional";
import StructureDefinition from "../nodes/StructureDefinition";
import Name from "../nodes/Name";
import Doc from "../nodes/Doc";
import Column from "../nodes/Column";
import Cell from "../nodes/Cell";
import Row from "../nodes/Row";
import TableLiteral from "../nodes/TableLiteral";
import ColumnType from "../nodes/ColumnType";
import TableType from "../nodes/TableType";
import Select from "../nodes/Select";
import Insert from "../nodes/Insert";
import Update from "../nodes/Update";
import Delete from "../nodes/Delete";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Reaction from "../nodes/Reaction";
import StreamType from "../nodes/StreamType";
import BooleanType from "../nodes/BooleanType";
import SetOrMapAccess from "../nodes/SetOrMapAccess";
import Reference from "../nodes/Reference";
import BooleanLiteral from "../nodes/BooleanLiteral";
import Convert from "../nodes/Convert";
import Unit from "../nodes/Unit";
import Language from "../nodes/Language";
import Is from "../nodes/Is";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import TypePlaceholder from "../nodes/TypePlaceholder";
import Previous from "../nodes/Previous";
import MapLiteral, { type MapItem } from "../nodes/MapLiteral";
import SetLiteral, { type SetItem } from "../nodes/SetLiteral";
import MapType from "../nodes/MapType";
import SetType from "../nodes/SetType";
import TypeInput from "../nodes/TypeInput";
import This from "../nodes/This";
import ConversionType from "../nodes/ConversionType";
import Dimension from "../nodes/Dimension";
import Docs from "../nodes/Docs";
import Names from "../nodes/Names";
import UnparsableType from "../nodes/UnparsableType";

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
    BIND_VALUE_NOT_ALLOWED
}

export class Tokens {
    /** The tokens that have been read. */
    readonly #read: Token[] = [];

    /** The tokens that have yet to be read. */
    readonly #unread: Token[];

    constructor(tokens: Token[]) {
        this.#unread = tokens.slice();
    }

    /** Returns the text of the next token */
    peek(): Token | undefined {
        return this.hasNext() ? this.#unread[0] : undefined
    }
    
    /** Returns the text of the next token */
    peekText(): string | undefined {
        return this.hasNext() ? this.#unread[0].text.toString() : undefined
    }

    /** Get the space of the next token */
    peekSpace(): string | undefined {
        return this.hasNext() ? this.#unread[0].space.toString() : undefined
    }

    /** Returns true if the token list isn't empty. */
    hasNext(): boolean {
        return this.#unread.length > 0;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: TokenType): boolean {
        return this.hasNext() && this.#unread[0].is(type);
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: TokenType): boolean {
        return this.hasNext() && this.#unread[0].isnt(type);
    }
    
    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: TokenType[]) {
        return types.every((type, index) => index < this.#unread.length && this.#unread[index].is(type));
    }

    /** Returns true if and only there was a previous token and it was of the given type. */
    previousWas(type: TokenType): boolean {
        return this.#read.length > 0 && this.#read[this.#read.length - 1].is(type);
    }
    
    beforeNextLineIs(type: TokenType) {
        // To detect this, we'll just peek ahead and see if there's a bind before the next line.
        let index = 0;
        while(index < this.#unread.length) {
            const token = this.#unread[index];
            if(index > 0 && this.#unread[index].hasPrecedingLineBreak()) break;
            if(token.is(type)) break;
            index++;
        }
        // If we found a bind, it's a bind.
        return index < this.#unread.length && this.#unread[index].is(type);        
    }    

    nextAreDocsThen(type: TokenType) {

        let index = 0;
        while(index < this.#unread.length) {
            const token = this.#unread[index];
            if(token.is(type)) return true;
            if(!token.is(TokenType.DOCS) && !token.is(TokenType.LANGUAGE) && !token.is(TokenType.NAME)) return false;
            index++;
        }
        return false;

    }

    nextIsOneOf(...types: TokenType[]): boolean {
        return types.find(type => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextLacksPrecedingSpace(): boolean {
        return this.hasNext() && !this.#unread[0].hasPrecedingSpace();
    }

    /** Returns true if and only if the next token has a preceding line break. */
    nextHasPrecedingLineBreak(): boolean {
        return this.hasNext() && this.#unread[0].hasPrecedingLineBreak();
    }

    /** Returns true if and only if the next token has a preceding line break. */
    nextLacksPrecedingLineBreak(): boolean {
        return this.hasNext() && !this.#unread[0].hasPrecedingLineBreak();
    }
    
    /** Returns true if and only if the next token after next has a preceding line break. */
    afterNextHasPrecedingLineBreak(): boolean {
        return this.#unread.length > 1  && this.#unread[1].hasPrecedingLineBreak();
    }
    
    /** Returns a token list without the first token. */
    read(expectedType?: TokenType): Token {
        const next = this.#unread.shift();
        if(next !== undefined) {
            if(expectedType !== undefined && !next.is(expectedType)) throw new Error("Internal parsing error; expected " + TokenType[expectedType] + ", received " + next.toString());
            this.#read.push(next);
            // Don't pass the original token; pass one with only the expected type.
            // This is helpful for syntax highlighting, as many tokens can have multiple types during
            // tokenization, but only one of those types in the AST.
            // We don't do this for numbers though, since we keep the multiple annotations on those for conversions.
            return next.is(TokenType.NUMBER) ? next : expectedType !== undefined ? next.withTypeNarrowedTo(expectedType) : next;
        }
        else
            return new Token("", TokenType.END);
    }

    /** Returns a node annotated with an error message, as well as all surrounding tokens. */
    readUnparsableLine(reason: SyntacticConflict, before: (Node|Node[]|undefined)[]): Unparsable {

        // Take the list of nodes and convert it into a flat list.
        let nodesBefore: Node[] = [];
        before.forEach(node => {
            if(node instanceof Node) nodesBefore.push(node);
            else if(Array.isArray(node)) nodesBefore = nodesBefore.concat(node);
        });

        // Find all of the tokens before the next line break, include them
        const indexOfNextAfter = this.#unread.findIndex(t => t.hasPrecedingLineBreak());
        const tokensAfter = this.#unread.splice(0, indexOfNextAfter < 1 ? 1 : indexOfNextAfter);

        // Create an unparsable node.
        const unparsable = new Unparsable(reason, nodesBefore, tokensAfter);

        // Put the unparsable tokens in the read list.
        while(tokensAfter.length > 0) {
            const next = tokensAfter.shift();
            if(next)
                this.#read.push(next);
        }
        return unparsable;
    }

    readLine() {
        const nodes: Node[] = [];
        while(this.peek()?.hasPrecedingLineBreak() === false)
            nodes.push(this.read());
        return nodes;
    }

    /** Rollback to the given token. */
    unreadTo(token: Token) {
        while(this.#read.length > 0 && this.#unread[0] !== token) {
            const unreadToken = this.#read.pop();
            if(unreadToken !== undefined)
                this.#unread.unshift(unreadToken);
        }
    }

}

export function parse(code: string): Program {
    return parseProgram(tokens(code));
}

export function tokens(code: string): Tokens {
    return new Tokens(tokenize(code));
}

// PROGRAM :: BORROW* BLOCK
export function parseProgram(tokens: Tokens): Program {

    // If a borrow is next or there's no whitespace, parse a docs.
    const docs = tokens.nextLacksPrecedingSpace() || tokens.nextIs(TokenType.BORROW) ? 
        parseDocumentation(tokens) : new Docs();

    const borrows = [];
    while(tokens.nextIs(TokenType.BORROW))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(tokens, true, false);

    // If the next token is the end, we're done! Otherwise, read all of the remaining 
    // tokens and bundle them into an unparsable.
    const end = tokens.nextIs(TokenType.END) ? 
        tokens.read(TokenType.END) :
        tokens.readUnparsableLine(SyntacticConflict.EXPECTED_END, []);

    return new Program(docs, borrows, block, end);

}

// BORROW :: ↓ name number?
export function parseBorrow(tokens: Tokens): Borrow | Unparsable {
    let borrow = tokens.read(TokenType.BORROW);
    let name;
    let version;

    if(tokens.nextIs(TokenType.NAME))
        name = tokens.read(TokenType.NAME);

    if(tokens.nextIs(TokenType.NUMBER) && !tokens.nextHasPrecedingLineBreak())
        version = tokens.read(TokenType.NUMBER);

    return new Borrow(borrow, name, version);
}

/** BLOCK :: DOCS ? ( [BIND|EXPRESSION]+ )  */
export function parseBlock(tokens: Tokens, root: boolean=false, creator: boolean=false): Block | Unparsable {

   // Grab any documentation if this isn't a root.
    let docs = root ? undefined : parseDocumentation(tokens);

    const open = root ? 
        undefined :
        tokens.nextIs(TokenType.EVAL_OPEN) ? 
            tokens.read(TokenType.EVAL_OPEN) :
            tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN, []);

    const statements = [];
    while(tokens.nextIsnt(TokenType.END) && (root || tokens.nextIsnt(TokenType.EVAL_CLOSE)))
        statements.push(
            nextIsBind(tokens, true) ? parseBind(tokens) :
            parseExpression(tokens)
        );

    const close = root ?
        undefined :
        tokens.nextIs(TokenType.EVAL_CLOSE) ? 
            tokens.read(TokenType.EVAL_CLOSE) :
            tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE, []);

    return new Block(statements, root, creator, open, close, docs);

}

function nextIsBind(tokens: Tokens, requireValue=false): boolean {

    const rollbackToken = tokens.peek();
    if(rollbackToken === undefined) return false;
    const bind = parseBind(tokens);
    tokens.unreadTo(rollbackToken);
    const expression = parseExpression(tokens);
    tokens.unreadTo(rollbackToken);
    const bindUnparsableCount = bind.nodes(n => n instanceof Unparsable).length;
    const expressionUnparsableCount = expression.nodes(n => n instanceof Unparsable).length;
    return bind instanceof Bind && (bind.dot !== undefined || bind.colon !== undefined) && bindUnparsableCount <= expressionUnparsableCount && (requireValue === false || bind.value !== undefined);

}

function nextIsConversion(tokens: Tokens): boolean {

    const rollbackToken = tokens.peek();
    if(rollbackToken === undefined) return false;
    const conversion = parseConversion(tokens);
    tokens.unreadTo(rollbackToken);
    return conversion instanceof ConversionDefinition && conversion.nodes().find(n => n instanceof Unparsable) === undefined;

}

/** BIND :: NAMES TYPE? (: EXPRESSION)? */
export function parseBind(tokens: Tokens): Bind | Unparsable {

    let docs = parseDocumentation(tokens);
    const share = tokens.nextIs(TokenType.SHARE) ? tokens.read(TokenType.SHARE) : undefined;
    const etc = tokens.nextIs(TokenType.ETC) ? tokens.read(TokenType.ETC) : undefined;
    const names = parseNames(tokens);
    let colon;
    let value;
    let dot;
    let type;

    if(names.names.length === 0)
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_BIND_NAME, [ docs ]);

    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read(TokenType.TYPE);
        type = parseType(tokens);
    }

    if(tokens.nextIs(TokenType.BIND)) {
        colon = tokens.read(TokenType.BIND); 
        value = parseExpression(tokens);
    }

    return new Bind(docs, names, type, value, share, etc, dot, colon);

}

/** ALIAS :: (name LANGUAGE?)+ */
export function parseNames(tokens: Tokens): Names {

    const names: Name[] = [];

    while((names.length > 0 && tokens.nextIs(TokenType.NAME_SEPARATOR)) || (names.length === 0 && tokens.nextIsOneOf(TokenType.NAME, TokenType.PLACEHOLDER))) {
        const comma = tokens.nextIs(TokenType.NAME_SEPARATOR) ? tokens.read(TokenType.NAME_SEPARATOR) : undefined;
        if(names.length > 0 && comma === undefined) break;
        const name = tokens.nextIs(TokenType.NAME) ? tokens.read(TokenType.NAME) : tokens.nextIs(TokenType.PLACEHOLDER) ? tokens.read(TokenType.PLACEHOLDER) : undefined;
        const lang = tokens.nextIs(TokenType.LANGUAGE) ? parseLanguage(tokens) : undefined;
        names.push(new Name(name, lang, comma));
    }

    return new Names(names);

}

/** LANGUAGE :: / name */
export function parseLanguage(tokens: Tokens): Language {

    const slash = tokens.read(TokenType.LANGUAGE);
    const lang = tokens.nextIs(TokenType.NAME) && !tokens.nextHasPrecedingLineBreak() ? tokens.read(TokenType.NAME) : undefined;
    return new Language(lang, slash);

}

/** EXPRESSION :: BINARY_OPERATION [ conditional EXPRESSION EXPRESSION ]? */
export function parseExpression(tokens: Tokens): Expression | Unparsable {

    const left = parseBinaryOperation(tokens);

    // Is it conditional statement?
    if(!(left instanceof Unparsable) && tokens.nextIs(TokenType.CONDITIONAL)) {
        const conditional = tokens.read(TokenType.CONDITIONAL);
        const yes = parseExpression(tokens);
        const no = parseExpression(tokens);
        return new Conditional(left, yes, no, conditional);    
    }
    else return left;

}

/** BINARY_OPERATION :: ATOMIC_EXPRESSION [ binary_op ATOMIC_EXPRESSION ]* */
export function parseBinaryOperation(tokens: Tokens): Expression | Unparsable {

    let left = parseAtomicExpression(tokens);

    while(tokens.nextIs(TokenType.BINARY_OP) || (tokens.nextIs(TokenType.TYPE_OP) && tokens.nextLacksPrecedingLineBreak())) {
        left = tokens.nextIs(TokenType.TYPE_OP) ? 
            new Is(left, tokens.read(TokenType.TYPE_OP), parseType(tokens)) :
            new BinaryOperation(tokens.read(TokenType.BINARY_OP), left, parseAtomicExpression(tokens));
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
function parseAtomicExpression(tokens: Tokens): Expression | Unparsable {

    // All expressions must start with one of the following
    let left: Expression | Unparsable = (
        // This
        tokens.nextIs(TokenType.THIS) ? new This(tokens.read(TokenType.THIS)) :
        // Placeholder
        tokens.nextIs(TokenType.PLACEHOLDER) ? new ExpressionPlaceholder(tokens.read(TokenType.PLACEHOLDER)) :
        // Nones
        tokens.nextIs(TokenType.NONE) ? parseNone(tokens): 
        // A conversion. Need to parse before names, otherwise we might slurp up a type alone instead of a conversion.
        nextIsConversion(tokens) ? parseConversion(tokens) :
        // Names or booleans are easy
        tokens.nextIs(TokenType.NAME) ? new Reference(tokens.read(TokenType.NAME)) :
        // Booleans
        tokens.nextIs(TokenType.BOOLEAN) ? new BooleanLiteral(tokens.read(TokenType.BOOLEAN)) :
        // Numbers with units
        tokens.nextIs(TokenType.NUMBER) ? parseMeasurement(tokens) :
        // Text with optional formats
        tokens.nextIs(TokenType.TEXT) ? parseText(tokens) :
        // A string template
        tokens.nextIs(TokenType.TEXT_OPEN) ? parseTemplate(tokens) :
        // A list
        tokens.nextIs(TokenType.LIST_OPEN) ? parseList(tokens) :
        // A set or map
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetOrMap(tokens) :
        // Table literals
        tokens.nextIs(TokenType.TABLE_OPEN) ? parseTable(tokens) :
        // A block expression
        tokens.nextAreDocsThen(TokenType.EVAL_OPEN) ? parseBlock(tokens) :
        // A structure definition
        tokens.nextAreDocsThen(TokenType.TYPE) ? parseStructure(tokens) :
        // A function function
        tokens.nextAreDocsThen(TokenType.FUNCTION) ? parseFunction(tokens) :
        // Unary expressions!
        tokens.nextIs(TokenType.UNARY_OP) ? new UnaryOperation(tokens.read(TokenType.UNARY_OP), parseAtomicExpression(tokens)) :
        // Anything that doesn't is unparsable.
        tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EXPRESSION, [])
    );

    // But wait! Is it one or more accessors? Slurp them up.
    while(!(left instanceof Unparsable)) {
        if(tokens.nextIs(TokenType.ACCESS))
            left = parseAccess(left, tokens);
        else if(tokens.nextIs(TokenType.LIST_OPEN) && tokens.nextLacksPrecedingSpace())
            left = parseListAccess(left, tokens);
        else if(tokens.nextIs(TokenType.SET_OPEN) && tokens.nextLacksPrecedingSpace())
            left = parseSetOrMapAccess(left, tokens);
        else if(tokens.nextIs(TokenType.PREVIOUS))
            left = parsePrevious(left, tokens);
        else if(tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE_VAR) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
        else if(tokens.nextIs(TokenType.CONVERT))
            left = parseConvert(left, tokens);
        else if(tokens.nextIs(TokenType.SELECT))
            left = parseSelect(left, tokens);
        else if(tokens.nextIs(TokenType.INSERT))
            left = parseInsert(left, tokens);
        else if(tokens.nextIs(TokenType.UPDATE))
            left = parseUpdate(left, tokens);
        else if(tokens.nextIs(TokenType.DELETE))
            left = parseDelete(left, tokens);
        else if(tokens.nextIs(TokenType.REACTION))
            left = parseReaction(left, tokens);
        else break;
    }
    return left;
    
}

/** NONE :: ! ALIASES */
function parseNone(tokens: Tokens): NoneLiteral | Unparsable {

    const error = tokens.read(TokenType.NONE);
    return new NoneLiteral(error);

}

/** NUMBER :: number name? */
function parseMeasurement(tokens: Tokens): MeasurementLiteral {

    const number = tokens.read(TokenType.NUMBER);
    const unit = tokens.nextIsOneOf(TokenType.NAME, TokenType.LANGUAGE) && tokens.nextLacksPrecedingSpace() ? parseUnit(tokens) : undefined;
    return new MeasurementLiteral(number, unit);

}

/** UNIT :: DIMENSION* (/ DIMENSION*)? */
function parseUnit(tokens: Tokens): Unit {
    
    // A unit is just a series of names, carets, numbers, and product symbols not separated by spaces.
    const numerator: Dimension[] = [];
    while(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
        numerator.push(parseDimension(tokens));

    let slash = undefined;
    const denominator: Dimension[] = [];
    if(tokens.nextIs(TokenType.LANGUAGE)) {
        slash = tokens.read(TokenType.LANGUAGE);
        while(tokens.nextIsOneOf(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
            denominator.push(parseDimension(tokens));
    }

    return new Unit(undefined, numerator, slash, denominator);

}

/** DIMENSION :: NAME (^NUMBER)? */
function parseDimension(tokens: Tokens): Dimension {

    const name = tokens.read(TokenType.NAME);
    let caret = undefined;
    let exponent = undefined;
    if(tokens.nextIs(TokenType.BINARY_OP) && tokens.peekText() === EXPONENT_SYMBOL && tokens.nextLacksPrecedingSpace()) {
        caret = tokens.read(TokenType.BINARY_OP);
        exponent = tokens.nextIs(TokenType.NUMBER) && tokens.nextLacksPrecedingSpace() ? tokens.read(TokenType.NUMBER) : undefined;
    }
    return new Dimension(name, caret, exponent);

}

/** TEXT :: text name? */
function parseText(tokens: Tokens): TextLiteral {

    const text = tokens.read(TokenType.TEXT);
    const format = tokens.nextIs(TokenType.LANGUAGE) ? parseLanguage(tokens) : undefined;
    return new TextLiteral(text, format);

}

/** TEMPLATE :: text_open ( EXPRESSION text_between )* EXPRESSION text_close name? */
function parseTemplate(tokens: Tokens): Template | Unparsable {

    const open = tokens.read(TokenType.TEXT_OPEN);
    const expressions: (Expression | Unparsable | Token)[] = [];

    do {
        expressions.push(parseExpression(tokens));
        const close = 
            tokens.nextIs(TokenType.TEXT_BETWEEN) ? tokens.read(TokenType.TEXT_BETWEEN) :
            tokens.nextIs(TokenType.TEXT_CLOSE) ? tokens.read(TokenType.TEXT_CLOSE) :
            undefined;
        if(close !== undefined)
            expressions.push(close);
        if(close === undefined || close.is(TokenType.TEXT_CLOSE))
            break;
    } while(true);

    // Read an optional format.
    const format = tokens.nextIs(TokenType.LANGUAGE) ? parseLanguage(tokens) : undefined;

    return new Template(open, expressions, format);

}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): ListLiteral | Unparsable {

    let open = tokens.read(TokenType.LIST_OPEN);
    let values: (Expression|Unparsable)[] = [];
    let close;

    while(tokens.nextIsnt(TokenType.LIST_CLOSE))
        values.push(parseExpression(tokens));

    if(tokens.nextIs(TokenType.LIST_CLOSE))
        close = tokens.read(TokenType.LIST_CLOSE);
    else
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_LIST_CLOSE, [ open, values ]);

    return new ListLiteral(values, open, close);

}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read(TokenType.LIST_OPEN);
        const index = parseExpression(tokens);
        if(tokens.nextIsnt(TokenType.LIST_CLOSE))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_LIST_CLOSE, [ left, open, index ]);
        const close = tokens.read(TokenType.LIST_CLOSE);

        left = new ListAccess(left, index, open, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE_VAR) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.LIST_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } | {:} */
function parseSetOrMap(tokens: Tokens): MapLiteral | SetLiteral | Unparsable {

    let open = tokens.read(TokenType.SET_OPEN);
    const values: (Expression|KeyValue|Unparsable)[] = [];

    // Is this an empty map?
    if(tokens.nextAre(TokenType.BIND, TokenType.SET_CLOSE)) {
        const bind = tokens.read(TokenType.BIND);
        return new MapLiteral([], open, bind, tokens.read(TokenType.SET_CLOSE));
    }

    while(tokens.nextIsnt(TokenType.SET_CLOSE)) {
        const key = parseExpression(tokens);
        if(tokens.nextIs(TokenType.BIND)) {
            const bind = tokens.read(TokenType.BIND);
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, value, bind))
        }
        else values.push(key);
    }

    const close = tokens.nextIs(TokenType.SET_CLOSE) ? tokens.read(TokenType.SET_CLOSE) : tokens.readUnparsableLine(SyntacticConflict.EXPECTED_SET_CLOSE, []);

    // Make a map
    return values.find(v => v instanceof KeyValue) !== undefined ? 
        new MapLiteral(values as MapItem[], open, undefined, close) :
        new SetLiteral(values as SetItem[], open, close);

}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetOrMapAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read(TokenType.SET_OPEN);
        const key = parseExpression(tokens);

        if(tokens.nextIsnt(TokenType.SET_CLOSE))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_SET_CLOSE, [ left, open, key ]);
        const close = tokens.read(TokenType.SET_CLOSE);

        left = new SetOrMapAccess(left, key, open, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE_VAR) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.SET_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** PREVIOUS :: EXPRESSION @ EXPRESSION */
function parsePrevious(stream: Expression, tokens: Tokens): Previous | Unparsable {

    const previous = tokens.read(TokenType.PREVIOUS);
    const index = parseExpression(tokens);

    return new Previous(stream, index, previous);

}

function parseTable(tokens: Tokens): TableLiteral {

    // Read the column definitions. Stop when we see a newline.
    const columns = [];
    while(tokens.nextIs(TokenType.TABLE_OPEN)) {
        const cell = tokens.read(TokenType.TABLE_OPEN);
        const bind = parseBind(tokens);
        columns.push(new Column(cell, bind));
    }

    // Read the table close.
    const close = tokens.nextIs(TokenType.TABLE_CLOSE) ? 
        tokens.read(TokenType.TABLE_CLOSE) : tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TABLE_CLOSE, []);    

    // Read the rows.
    const rows = [];
    while(tokens.nextIs(TokenType.TABLE_OPEN))
        rows.push(parseRow(tokens));

    return new TableLiteral(columns, rows, close);

}

/** ROW :: [| (BIND|EXPRESSION)]+ | */
function parseRow(tokens: Tokens): Row {

    const cells = [];
    // Read the cells.
    while(tokens.nextIs(TokenType.TABLE_OPEN)) {
        const cell = tokens.read(TokenType.TABLE_OPEN);
        const value = nextIsBind(tokens) ? parseBind(tokens) : parseExpression(tokens);
        cells.push(new Cell(cell, value));
    }

    // Read the closing row marker.
    const close = tokens.nextIs(TokenType.TABLE_CLOSE) ?
        tokens.read(TokenType.TABLE_CLOSE) : 
        new Unparsable(SyntacticConflict.EXPECTED_TABLE_CLOSE, [], []);
    
    return new Row(cells, close);

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

/** STREAM :: EXPRESSION ∆ EXPRESSION EXPRESSION */
function parseReaction(initial: Expression, tokens: Tokens): Reaction {
    const delta = tokens.read(TokenType.REACTION);
    const stream = parseExpression(tokens);
    const next = parseExpression(tokens);
    return new Reaction(initial, stream, next, delta); 
}

/** FUNCTION :: DOCS? (ƒ | ALIASES) TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
function parseFunction(tokens: Tokens): FunctionDefinition | Unparsable {

    const docs = parseDocumentation(tokens);

    if(tokens.nextIsnt(TokenType.FUNCTION)) return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_FUNCTION, [ docs ]);

    const fun = tokens.read(TokenType.FUNCTION);

    const names = tokens.nextIsOneOf(TokenType.NAME, TokenType.PLACEHOLDER) ? parseNames(tokens) : undefined;

    const typeVars = parseTypeVariables(tokens);

    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN, [ docs, fun, names, typeVars ]);
    const open = tokens.read(TokenType.EVAL_OPEN);

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE, [ docs, fun, names, typeVars, open, inputs ]);
    const close = tokens.read(TokenType.EVAL_CLOSE);

    let dot;
    let output;
    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read(TokenType.TYPE);
        output = parseType(tokens);
    }

    const expression = tokens.nextIs(TokenType.ETC) ? tokens.read(TokenType.ETC) : parseExpression(tokens);

    return new FunctionDefinition(docs, names, typeVars, inputs, expression, output, fun, dot, open, close);

}

/** EVAL :: EXPRESSION (∘TYPE)* (EXPRESSION*) */
function parseEvaluate(left: Expression | Unparsable, tokens: Tokens): Evaluate | Unparsable {

    const typeInputs: TypeInput[] = [];

    while(tokens.nextIs(TokenType.TYPE_VAR)) {
        const dot = tokens.read(TokenType.TYPE_VAR);
        const type = parseType(tokens);
        typeInputs.push(new TypeInput(type, dot));
    }
    
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN, [ left, typeInputs ]);

    const open = tokens.read(TokenType.EVAL_OPEN);
    const inputs: (Bind|Expression|Unparsable)[] = [];
    let close;
    
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE) && (tokens.peekSpace() ?? "").split("\n").length - 1 < 2)
        inputs.push(nextIsBind(tokens, true) ? parseBind(tokens) : parseExpression(tokens));
    
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.read(TokenType.EVAL_CLOSE);
    
    return new Evaluate(left, inputs, typeInputs, open, close);

}

/** CONVERSION :: DOCS? TYPE → TYPE EXPRESSION */
function parseConversion(tokens: Tokens): ConversionDefinition | Unparsable {

    const docs = parseDocumentation(tokens);
    const input = parseType(tokens, true);
    if(!tokens.nextIs(TokenType.CONVERT))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_CONVERT, [ docs, input ]);
    const convert = tokens.read(TokenType.CONVERT);
    const output = parseType(tokens, true);
    const expression = parseExpression(tokens);

    return new ConversionDefinition(docs, input, output, expression, convert);

}

/** CONVERT :: EXPRESSION → TYPE */
function parseConvert(expression: Expression, tokens: Tokens): Convert {

    const convert = tokens.read(TokenType.CONVERT);
    const type = parseType(tokens, true);
        
    return new Convert(expression, type, convert);

}

/** TYPE_VARS :: (∘NAME)* */
function parseTypeVariables(tokens: Tokens): (TypeVariable|Unparsable)[] {

    const vars = [];
    while(tokens.nextIs(TokenType.TYPE_VAR)) {
        const type = tokens.read(TokenType.TYPE_VAR);
        const names = parseNames(tokens);
        vars.push(new TypeVariable(names, type));
    }
    return vars;

}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parseAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    if(!tokens.nextIs(TokenType.ACCESS))
        return left;
    do {

        const access = tokens.read(TokenType.ACCESS);
        let name;
        if(tokens.nextIsOneOf(TokenType.NAME, TokenType.PLACEHOLDER, TokenType.UNARY_OP, TokenType.BINARY_OP))
            name =  tokens.nextIs(TokenType.NAME) ? tokens.read(TokenType.NAME) :
                    tokens.nextIs(TokenType.PLACEHOLDER) ? tokens.read(TokenType.PLACEHOLDER) :
                    tokens.nextIs(TokenType.UNARY_OP) ? tokens.read(TokenType.UNARY_OP) :
                    tokens.read(TokenType.BINARY_OP);

        left = new PropertyReference(left, name, access);

        // But wait, is it a function evaluation?
        if(tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE_VAR) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.ACCESS));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** TYPE :: (? | name | MEASUREMENT_TYPE | TEXT_TYPE | NONE_TYPE | LIST_TYPE | SET_TYPE | FUNCTION_TYPE | STREAM_TYPE) (∨ TYPE)* */
export function parseType(tokens: Tokens, isExpression:boolean=false): Type {
    let left: Type = (
        tokens.nextIs(TokenType.PLACEHOLDER) ? new TypePlaceholder(tokens.read(TokenType.PLACEHOLDER)) :
        tokens.nextIs(TokenType.NAME) ? new NameType(tokens.read(TokenType.NAME)) :
        tokens.nextIs(TokenType.BOOLEAN_TYPE) ? new BooleanType(tokens.read(TokenType.BOOLEAN_TYPE)) :
        tokens.nextIsOneOf(TokenType.NUMBER, TokenType.NUMBER_TYPE) ? parseMeasurementType(tokens) :
        tokens.nextIs(TokenType.TEXT) ? parseTextType(tokens) :
        tokens.nextIs(TokenType.NONE) ? parseNoneType(tokens) :
        tokens.nextIs(TokenType.LIST_OPEN) ? parseListType(tokens) :
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetOrMapType(tokens) :
        tokens.nextIs(TokenType.TABLE_OPEN) ? parseTableType(tokens) :
        tokens.nextIs(TokenType.FUNCTION) ? parseFunctionType(tokens) :
        tokens.nextIs(TokenType.REACTION) ? parseStreamType(tokens) :
        new UnparsableType(tokens.readLine())
    );

    if(!isExpression && tokens.nextIs(TokenType.CONVERT))
        left = parseConversionType(left, tokens);

    while(!(left instanceof Unparsable) && tokens.nextIs(TokenType.UNION)) {
        const or = tokens.read(TokenType.UNION);
        left = new UnionType(left, parseType(tokens), or);
    }
    
    return left;

}

/** TEXT_TYPE :: TEXT LANGUAGE? */
function parseTextType(tokens: Tokens): TextType {

    const quote = tokens.read(TokenType.TEXT);
    const format = tokens.nextIs(TokenType.LANGUAGE) ? parseLanguage(tokens) : undefined;
    return new TextType(quote, format);

}

/** NUMBER_TYPE :: #NAME? */
function parseMeasurementType(tokens: Tokens): MeasurementType {

    const number = tokens.nextIs(TokenType.NUMBER) ? tokens.read(TokenType.NUMBER) : tokens.read(TokenType.NUMBER_TYPE);
    const unit = tokens.nextIsOneOf(TokenType.NAME, TokenType.LANGUAGE) && tokens.nextLacksPrecedingSpace() ? parseUnit(tokens) : undefined;
    return new MeasurementType(number, unit);

}

/** NONE_TYPE :: !NAME? */
function parseNoneType(tokens: Tokens): NoneType {

    const none = tokens.read(TokenType.NONE_TYPE);
    return new NoneType(none);

}

/** STREAM_TYPE :: ∆ TYPE */
function parseStreamType(tokens: Tokens): StreamType {

    const stream = tokens.read(TokenType.STREAM_TYPE);
    const type = parseType(tokens);
    return new StreamType(type, stream);

}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType {

    const open = tokens.read(TokenType.LIST_OPEN);
    const type = tokens.nextIsnt(TokenType.LIST_CLOSE) ? parseType(tokens) : undefined;
    const close = tokens.nextIs(TokenType.LIST_CLOSE) ? tokens.read(TokenType.LIST_CLOSE) : undefined;
    return new ListType(type, open, close);    

}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetOrMapType(tokens: Tokens): SetType | MapType {

    const open = tokens.read(TokenType.SET_OPEN);
    let key = undefined;
    let bind = undefined;
    let value = undefined;
    if(tokens.nextIsnt(TokenType.SET_CLOSE)) {
        if(!tokens.nextIs(TokenType.BIND)) key = parseType(tokens);
        bind = tokens.nextIs(TokenType.BIND) ? tokens.read(TokenType.BIND) : undefined;
        value = bind !== undefined && !tokens.nextIs(TokenType.SET_CLOSE) ? parseType(tokens) : undefined;
    }
    const close = tokens.nextIs(TokenType.SET_CLOSE) ? tokens.read(TokenType.SET_CLOSE) : undefined;
    return bind === undefined ? new SetType(key, open, close) : new MapType(key, value, open, bind, close);

}

/** TABLE_TYPE :: (| BIND)+ | */
function parseTableType(tokens: Tokens): TableType {

    const columns = [];
    while(tokens.nextIs(TokenType.TABLE_OPEN)) {
        const bar = tokens.read(TokenType.TABLE_OPEN);
        const bind = parseBind(tokens);
        columns.push(new ColumnType(bind, bar))
    }
    const close = tokens.nextIs(TokenType.TABLE_CLOSE) ? tokens.read(TokenType.TABLE_CLOSE) : undefined;
    return new TableType(columns, close);

}

/** FUNCTION_TYPE :: ƒ( BIND* ) TYPE */
function parseFunctionType(tokens: Tokens): FunctionType | UnparsableType {

    const fun = tokens.read(TokenType.FUNCTION);
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return new UnparsableType([ fun, ... tokens.readLine() ]);
    const open = tokens.read(TokenType.EVAL_OPEN);

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.hasNext() && tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(tokens));

    const close = tokens.read(TokenType.EVAL_CLOSE);

    const output = parseType(tokens);

    return new FunctionType(inputs, output, fun, open, close);

}

/** CONVERSION_TYPE :: TYPE → TYPE */
function parseConversionType(left: Type, tokens: Tokens): ConversionType {

    const convert = tokens.read(TokenType.CONVERT);
    const to = parseType(tokens);

    return new ConversionType(left, convert, to);

}

/** CUSTOM_TYPE :: DOCS? • ALIASES (•NAME)* TYPE_VARS ( BIND* ) BLOCK? */
export function parseStructure(tokens: Tokens): StructureDefinition | Unparsable {

    const docs = parseDocumentation(tokens);

    if(tokens.nextIsnt(TokenType.TYPE)) return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TYPE, [ docs ]);

    const type = tokens.read(TokenType.TYPE);

    const aliases = parseNames(tokens);

    const interfaces: TypeInput[] = [];
    while(tokens.nextIs(TokenType.TYPE)) {
        const dot = tokens.read(TokenType.TYPE);
        if(tokens.nextIsnt(TokenType.NAME))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_STRUCTURE_NAME, [ docs, type, aliases, dot ]);
        const name = tokens.read(TokenType.NAME);
        interfaces.push(new TypeInput(new NameType(name), dot));
    }

    const typeVars = parseTypeVariables(tokens);

    const inputs: (Bind|Unparsable)[] = [];
    let open;
    let close;
    if(tokens.nextIs(TokenType.EVAL_OPEN)) {
        open = tokens.read(TokenType.EVAL_OPEN);
        while(tokens.nextIsnt(TokenType.EVAL_CLOSE) && (nextIsBind(tokens, false) || tokens.nextIs(TokenType.NAME)))
            inputs.push(parseBind(tokens));
        if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE, [ docs, type, aliases, interfaces, typeVars, open, inputs  ]);
        close = tokens.read(TokenType.EVAL_CLOSE);
    }

    const block = tokens.nextAreDocsThen(TokenType.EVAL_OPEN) ? parseBlock(tokens, false, true) : undefined;

    return new StructureDefinition(docs, aliases, interfaces, typeVars, inputs, block, type, open, close);

}

function parseDocumentation(tokens: Tokens): Docs  {

    const docs = [];
    while(tokens.nextIs(TokenType.DOCS) && (docs.length === 0 || (tokens.peekSpace()?.split("\n").length ?? 0) - 1 <= 1 )) {
        const doc = tokens.read(TokenType.DOCS);
        const lang = tokens.nextIs(TokenType.LANGUAGE) ? parseLanguage(tokens) : undefined;
        docs.push(new Doc(doc, lang));
    }
    return new Docs(docs);

}