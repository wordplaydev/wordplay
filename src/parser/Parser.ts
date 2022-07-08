import { tokenize } from "./Tokenizer";
import { Token, TokenType } from "./Token";

import type Expression from "./Expression";
import type Type from "./Type";

import Program from "./Program";
import Borrow from "./Borrow";
import Unparsable from "./Unparsable";
import Block from "./Block";
import List from "./List";
import SetNode from "./Set";
import Bind from "./Bind";
import Evaluate from "./Evaluate";
import UnaryOperation from "./UnaryOperation";
import BinaryOperation from "./BinaryOperation";
import AccessName from "./AccessName";
import Parenthetical from "./Parenthetical";
import Function from "./Function";
import Template from "./Template";
import UnionType from "./UnionType";
import None from "./None";
import Measurement from "./Measurement";
import MeasurementType from "./MeasurementType";
import Text from "./Text";
import NameType from "./NameType";
import OopsType from "./OopsType";
import TextType from "./TextType";
import ListType from "./ListType";
import SetType from "./SetType";
import FunctionType from "./FunctionType";
import TypeVariables from "./TypeVariables";
import KeyValue from "./KeyValue";
import ListAccess from "./ListAccess";
import { Conditional } from "./Conditional";
import Share from "./Share";
import CustomType from "./CustomType";
import Documented from "./Documented";
import Alias from "./Alias";
import Docs from "./Docs";
import Column from "./Column";
import Cell from "./Cell";
import Row from "./Row";
import Table from "./Table";

export enum ErrorMessage {
    UNEXPECTED_SHARE,
    EXPECTED_NAME,
    EXPECTED_EVAL_OPEN,
    EXPECTED_EVAL_CLOSE,
    EXPECTED_LINES,
    EXPECTED_EXPRESSION,
    EXPECTED_LIST_OPEN,
    EXPECTED_LIST_CLOSE,
    EXPECTED_SET_OPEN,
    EXPECTED_SET_CLOSE,
    EXPECTED_MAP_OPEN,
    EXPECTED_MAP_CLOSE,
    EXPECTED_MAP_NAME,
    EXPECTED_MAP_BIND,
    EXPECTED_NAME_BIND,
    EXPECTED_TYPE,
    EXPECTED_ACCESS_NAME,
    EXPECTED_TEXT_OPEN,
    EXPECTED_TEXT_CLOSE,
    EXPECTED_ERROR_NAME,
    EXPECTED_TYPE_VARS_CLOSE
}

class Tokens {
    /** The tokens that have been read. */
    readonly #read: Token[] = [];

    /** The tokens that have yet to be read. */
    readonly #unread: Token[];

    constructor(tokens: Token[]) {
        this.#unread = tokens;
    }

    /** Returns the text of the next token */
    peek(): string | undefined {
        return this.hasNext() ? this.#unread[0].text : undefined
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

    nextIsBind() {
        // ALIAS :: (DOCS? NAME LANG? NAME?)+ bind 
        // To detect this, we'll just peek ahead and see if it follows this pattern.
        let index = 0;
        while(index < this.#unread.length && !this.#unread[index].is(TokenType.BIND)) {
            const token = this.#unread[index];
            if(!(token.is(TokenType.DOCS) || token.is(TokenType.NAME) || token.is(TokenType.LANGUAGE)))
                return false;
            index++;
        }
        // If we found a bind, it's a bind.
        return this.#unread[index].is(TokenType.BIND);

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
    read(): Token {
        if(this.hasNext()) {
            const token = this.#unread.shift() as Token;
            this.#read.push(token);
            return token;
        }
        else
            return new Token("", [ TokenType.END ], this.#read.length === 0 ? 0 : this.#read[this.#read.length - 1].getIndex() + this.#read[this.#read.length - 1].getLength());
    }

    /** Returns a token list without all of the tokens until the next line or the end of the list. */
    readUnparsableLine(reason: ErrorMessage): Unparsable {
        const index = this.#unread.findIndex(t => t.hasPrecedingLineBreak());
        return new Unparsable(reason, this.#unread.splice(0, index < 1 ? this.#unread.length : index));
    }

}

export function parse(code: string): Program {
    return parseTokens(tokenize(code));
}

export function parseTokens(tokens: Token[]): Program {
    return parseProgram(new Tokens(tokens));
}

// PROGRAM :: BORROW* BLOCK
export function parseProgram(tokens: Tokens): Program {

    const borrows = [];
    while(tokens.nextIs(TokenType.BORROW))
        borrows.push(parseBorrow(tokens));

    const block = parseBlock(true, tokens);

    return new Program(borrows, block);

}

// BORROW :: ↓ name number?
export function parseBorrow(tokens: Tokens): Borrow | Unparsable {
    let borrow = tokens.read();
    let name;
    let version;

    if(tokens.nextIs(TokenType.NAME))
        name = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_NAME);

    if(tokens.nextIs(TokenType.NUMBER))
        version = tokens.read();

    return new Borrow(borrow, name, version);
}

/** BLOCK :: EXPR_OPEN? LINES (BIND|EXPRESSION) LINES EXPR_CLOSE? */
export function parseBlock(root: boolean, tokens: Tokens): Block | Unparsable {
    let open;
    let close;
    let statements = [];

    // Grab any documentation
    let docs = parseDocs(tokens);

    if(!root) {
        open = tokens.nextIs(TokenType.EVAL_OPEN) ? 
            tokens.read() :
            tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
        if(!tokens.nextHasPrecedingLineBreak())
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_LINES);
    }

    while(tokens.nextIsnt(TokenType.END) && tokens.nextIsnt(TokenType.EVAL_CLOSE)) {
        if( tokens.nextIsBind())
            statements.push(parseBind(tokens))
        else if(tokens.nextIs(TokenType.SHARE))
            statements.push(parseShare(tokens));
        else
            statements.push(parseExpression(tokens));
        if(!tokens.nextHasPrecedingLineBreak() && tokens.nextIsnt(TokenType.END))
            statements.push(tokens.readUnparsableLine(ErrorMessage.EXPECTED_LINES))
    }

    if(!root) {
        close = tokens.nextIs(TokenType.EVAL_CLOSE) ? 
            tokens.read() :
            tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);
    }

    return new Block(docs, statements, open, close);

}

function parseShare(tokens: Tokens): Share {

    const share = tokens.read();
    const bind = parseBind(tokens);
    return new Share(share, bind);

}

/**
 * 
 * EXPRESSION :: 
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
 *   CUSTOM |
 *   DOCS |
 */
function parseExpression(tokens: Tokens): Expression {

    // Is this expression excluded?
    const excluded = parseDocs(tokens);
    
    // All expressions must start with one of the following
    let left: Expression = (
        // A block. (Has precedent over inline parenthetical).
        (tokens.nextIs(TokenType.EVAL_OPEN) && tokens.afterNextHasPrecedingLineBreak()) ? parseBlock(false, tokens) :
        // A parenthetical
        tokens.nextAre(TokenType.EVAL_OPEN) ? parseParenthetical(tokens) :
        // Numbers with units
        tokens.nextIs(TokenType.NUMBER) ? parseMeasurement(tokens) :
        // Text with optional formats
        tokens.nextIs(TokenType.TEXT) ? parseText(tokens) :
        // Names or booleans are easy
        tokens.nextIsOneOf(TokenType.NAME, TokenType.BOOLEAN) ? tokens.read() :
        // Nones
        tokens.nextIs(TokenType.NONE) ? parseNone(tokens): 
        // Custom types
        (tokens.nextIs(TokenType.TYPE) || tokens.nextAre(TokenType.DOCS, TokenType.TYPE)) ? parseCustomType(tokens) :
        // A function
        (tokens.nextIs(TokenType.FUNCTION) || tokens.nextAre(TokenType.DOCS, TokenType.FUNCTION)) ? parseFunction(tokens) :
        // A list
        tokens.nextIs(TokenType.LIST_OPEN) ? parseList(tokens) :
        // A set
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetOrMap(tokens) :
        // Table literals
        tokens.nextIs(TokenType.CELL) ? parseTable(tokens) :
        // A string template
        tokens.nextIs(TokenType.TEXT_OPEN) ? parseTemplate(tokens) :
        // Unary expressions!
        (tokens.nextIs(TokenType.UNARY_OP)) ? new UnaryOperation(tokens.read(), parseExpression(tokens)) :
        // Anything that doesn't is unparsable.
        tokens.readUnparsableLine(ErrorMessage.EXPECTED_EXPRESSION)
    );

    // But wait! Is it one or more accessors? Slurp them up.
    while(tokens.nextIsOneOf(TokenType.ACCESS, TokenType.LIST_OPEN, TokenType.SET_OPEN, TokenType.EVAL_OPEN)) {
        if(tokens.nextIs(TokenType.ACCESS))
            left = parseAccess(left, tokens);
        else if(tokens.nextIs(TokenType.LIST_OPEN))
            left = parseListAccess(left, tokens);
        else if(tokens.nextIs(TokenType.SET_OPEN))
            left = parseSetAccess(left, tokens);
        // Is it a function evaluation on a name?
        else if(tokens.nextIs(TokenType.EVAL_OPEN) && tokens.nextLacksPrecedingSpace())
            left = parseEval(left, tokens);
    }
    
    // Is it conditional statement?
    if(tokens.nextIs(TokenType.CONDITIONAL))
        left = parseConditional(left, tokens);

    // Finally, keep reading binary operators until we see no more. Order of operations is 
    // plain left to right; we rely on tools to warn about evaluation order.
    while(tokens.nextIs(TokenType.BINARY_OP)) {
        const operator = tokens.read();
        const right = parseExpression(tokens);
        left = new BinaryOperation(operator, left, right);
    }

    // Is the expression excluded? Wrap it.
    if(excluded.length > 0)
        left = new Documented(excluded, left);

    // Return the beautiful tree we built.
    return left;

}

/** CONDITIONAL :: EXPRESSSION ? EXPRESSION EXPRESSION */
function parseConditional(condition: Expression, tokens: Tokens): Conditional {
    const conditional = tokens.read();
    const yes = parseExpression(tokens);
    const no = parseExpression(tokens);
    return new Conditional(condition, conditional, yes, no);

}

/** NUMBER :: number name? */
function parseMeasurement(tokens: Tokens): Measurement {

    const number = tokens.read();
    let unit;
    if(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace()) {
        unit = tokens.read();
    }
    return new Measurement(number, unit);

}

/** TEXT :: text name? 
 * 
 * Most often a 3-letter ISO 639-2 code, but could be anyything: https://en.wikipedia.org/wiki/ISO_639-2
*/
function parseText(tokens: Tokens): Text {

    const text = tokens.read();
    let format;
    if(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
        format = tokens.read();
    return new Text(text, format);

}

/** NONE :: ! NAME? */
function parseNone(tokens: Tokens): None | Unparsable {

    const error = tokens.read();
    if(tokens.nextIs(TokenType.NAME)) {
        const name = tokens.read();
        return new None(error, name);
    }
    return tokens.readUnparsableLine(ErrorMessage.EXPECTED_ERROR_NAME);

}

/** PARENTHETICAL :: ( EXPRESSION ) */
function parseParenthetical(tokens: Tokens): Parenthetical | Unparsable {
    let open;
    let close;
    if(tokens.nextIs(TokenType.EVAL_OPEN))
        open = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);

    const value = parseExpression(tokens);
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);

    return new Parenthetical(open, value, close);

}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read();
        const index = parseExpression(tokens);
        if(tokens.nextIsnt(TokenType.LIST_CLOSE))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_LIST_CLOSE);
        const close = tokens.read();

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEval(left, tokens);

    } while(tokens.nextIs(TokenType.LIST_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetAccess(left: Expression, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read();
        const index = parseExpression(tokens);
        if(tokens.nextIsnt(TokenType.SET_CLOSE))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_LIST_CLOSE);
        const close = tokens.read();

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEval(left, tokens);

    } while(tokens.nextIs(TokenType.SET_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parseAccess(left: Expression, tokens: Tokens): Expression | Unparsable {
    if(!tokens.nextIs(TokenType.ACCESS))
        return left;
    do {

        const access = tokens.read();
        let name;
        if(tokens.nextIs(TokenType.NAME))
            name = tokens.read();
        else return tokens.readUnparsableLine(ErrorMessage.EXPECTED_ACCESS_NAME);

        left = new AccessName(left, access, name);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEval(left, tokens);

    } while(tokens.nextIs(TokenType.ACCESS));

    // Return the series of accesses and evaluatios we created.
    return left;
}

/** EVAL :: EXPRESSION (EXPRESSION*) */
function parseEval(left: Expression, tokens: Tokens): Evaluate | Unparsable {

    const open = tokens.read();
    const objects = [];
    let close;
    
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        objects.push(parseExpression(tokens));
    
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
    
    return new Evaluate(open, left, objects, close);    

}

/** FUNCTION :: ƒ TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
function parseFunction(tokens: Tokens): Function | Unparsable {

    const docs = parseDocs(tokens);

    const fun = tokens.read();

    const typeVars = tokens.nextIs(TokenType.TYPE_VARS) ? parseTypeVariables(tokens) : undefined;

    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    let type;
    let output;
    if(tokens.nextIs(TokenType.TYPE)) {
        type = tokens.read();
        output = parseType(tokens);
    }

    const expression = parseExpression(tokens);

    return new Function(docs, fun, open, inputs, close, expression, typeVars, type, output);

}

function parseTypeVariables(tokens: Tokens): TypeVariables | Unparsable {

    const open = tokens.read();
    const names = [];
    while(tokens.nextIs(TokenType.NAME))
        names.push(tokens.read());
    if(tokens.nextIsnt(TokenType.TYPE_VARS))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_TYPE_VARS_CLOSE);
    const close = tokens.read();
    return new TypeVariables(open, names, close);

}

function parseDelimited<T extends Expression | KeyValue>(tokens: Tokens, openType: TokenType, closeType: TokenType, openError: ErrorMessage, closeError: ErrorMessage, keyValue: boolean): Unparsable | [ Token, (T|Unparsable)[], Token ] {

    let open;
    let values: (T|Unparsable)[] = [];
    let close;
    let foundBind = false;

    if(tokens.nextIs(openType))
        open = tokens.read();
    else
        return tokens.readUnparsableLine(openError);

    while(tokens.nextIsnt(closeType)) {

        const key = parseExpression(tokens);

        if(keyValue && tokens.nextIs(TokenType.BIND))
            foundBind = true;

        if(foundBind) {
            if(tokens.nextIsnt(TokenType.BIND))
                return tokens.readUnparsableLine(ErrorMessage.EXPECTED_MAP_BIND);
            const bind = tokens.read();            
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, bind, value) as T|Unparsable)
        }
        else {
            values.push(key as T|Unparsable);
        }

    }

    if(tokens.nextIs(closeType))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(closeError);

    return [ open, values, close ];

}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): List | Unparsable {

    const stuff = parseDelimited<Expression>(
        tokens, 
        TokenType.LIST_OPEN, 
        TokenType.LIST_CLOSE, 
        ErrorMessage.EXPECTED_LIST_OPEN, 
        ErrorMessage.EXPECTED_LIST_CLOSE, 
        false
    );
    return stuff instanceof Unparsable ? stuff : new List(stuff[0], stuff[1], stuff[2]);

}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } */
function parseSetOrMap(tokens: Tokens): SetNode | Unparsable {

    const stuff = parseDelimited<Expression>(
        tokens, 
        TokenType.SET_OPEN, 
        TokenType.SET_CLOSE, 
        ErrorMessage.EXPECTED_SET_OPEN, 
        ErrorMessage.EXPECTED_SET_CLOSE, 
        true
    );
    return stuff instanceof Unparsable ? stuff : new SetNode(stuff[0], stuff[1], stuff[2]);

}

function parseTable(tokens: Tokens): Table {

    // Read the column definitions. Stop when we see a newline.
    const columns = [];
    while(tokens.nextIs(TokenType.CELL)) {
        const cell = tokens.read();
        const bind = parseBind(tokens);
        columns.push(new Column(cell, bind));
        if(tokens.nextHasPrecedingLineBreak())
            break;
    }

    // Read the rows.
    const rows = [];
    while(tokens.nextIs(TokenType.CELL)) {
        const cells = [];
        // Read the cells.
        while(tokens.nextIs(TokenType.CELL)) {
            const cell = tokens.read();
            const value = parseExpression(tokens);
            cells.push(new Cell(cell, value));
            if(tokens.nextHasPrecedingLineBreak())
                break;
        }
        rows.push(new Row(cells));
    }

    return new Table(columns, rows);

}

/** BIND :: name TYPE? : EXPRESSION */
function parseBind(tokens: Tokens): Bind | Unparsable {

    let docs = parseDocs(tokens);
    let names = [];
    let colon;
    let value;
    let dot;
    let type;

    while(tokens.nextIs(TokenType.NAME)) {
        const name = tokens.read();
        const alias = tokens.nextIs(TokenType.LANGUAGE) ? tokens.read() : undefined;
        const lang = alias ? tokens.read() : undefined;
        names.push(new Alias(name, alias, lang));
    }
    if(names.length === 0)
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_NAME);

    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read();
        type = parseType(tokens);
    }

    if(tokens.nextIs(TokenType.BIND)) {
        colon = tokens.read(); 
        value = parseExpression(tokens);
    }

    return new Bind(docs, names, colon, value, dot, type);

}

/** TEMPLATE :: text_open ( EXPRESSION text_between )* EXPRESSION text_close */
function parseTemplate(tokens: Tokens): Template | Unparsable {

    const parts = [];
    let format;

    if(!tokens.nextIs(TokenType.TEXT_OPEN))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_TEXT_OPEN);
    parts.push(tokens.read());

    do {
        const expression = parseExpression(tokens);
        if(expression instanceof Unparsable) return expression;
        parts.push(expression);
        if(tokens.nextIs(TokenType.TEXT_BETWEEN))
            parts.push(tokens.read());
    } while(tokens.nextIsnt(TokenType.TEXT_CLOSE));

    if(!tokens.nextIs(TokenType.TEXT_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_TEXT_CLOSE);
    parts.push(tokens.read());

    // Read an optional format if there's no preceding space.
    if(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
        format = tokens.read();

    return new Template(parts, format);

}

/** TYPE :: 
 *    ?
 *    " 
 *    # 
 *    ! 
 *    {TYPE}
 *    [TYPE]
 *    <TYPE:TYPE>
 *    TYPE | TYPE
 * */
function parseType(tokens: Tokens): Type | Unparsable {
    let left: Type = (
        tokens.nextIs(TokenType.NAME) ? new NameType(tokens.read()) :
        tokens.nextIs(TokenType.NUMBER_TYPE) ? parseMeasurementType(tokens) :
        tokens.nextIs(TokenType.TEXT_TYPE) ? parseTextType(tokens) :
        tokens.nextIs(TokenType.NONE) ? parseOopsType(tokens) :
        tokens.nextIs(TokenType.LIST_OPEN) ? parseListType(tokens) :
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetType(tokens) :
        tokens.nextIs(TokenType.FUNCTION) ? parseFunctionType(tokens) :
        tokens.readUnparsableLine(ErrorMessage.EXPECTED_TYPE)
    );

    while(tokens.nextIs(TokenType.UNION))
        left = new UnionType(left, tokens.read(), parseType(tokens));
    
    return left;

}

/** TEXT_TYPE :: text_type NAME? */
function parseTextType(tokens: Tokens): TextType {

    const quote = tokens.read();
    const format = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new TextType(quote, format);

}

/** OOPS_TYPE :: !NAME? */
function parseOopsType(tokens: Tokens): OopsType {

    const oops = tokens.read();
    const name = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new OopsType(oops, name);

}

/** NUMBER_TYPE :: #NAME? */
function parseMeasurementType(tokens: Tokens): MeasurementType {

    const number = tokens.read();
    const unit = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new MeasurementType(number, unit);

}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType | Unparsable {

    const open = tokens.read();
    const type = parseType(tokens);
    if(tokens.nextIsnt(TokenType.LIST_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_LIST_CLOSE);
    const close = tokens.read();
    return new ListType(open, type, close);    

}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetType(tokens: Tokens): SetType | Unparsable {

    const open = tokens.read();
    const type = parseType(tokens);
    const bind = tokens.nextIs(TokenType.BIND) ? tokens.read() : undefined;
    const value = bind !== undefined ? parseType(tokens) : undefined;
    if(tokens.nextIsnt(TokenType.SET_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_SET_CLOSE);
    const close = tokens.read();
    return new SetType(open, type, close, bind, value);

}

/** FUNCTION_TYPE :: ƒ([•TYPE]*) •TYPE */
function parseFunctionType(tokens: Tokens): FunctionType | Unparsable {

    const fun = tokens.read();
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const input = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        input.push(parseType(tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    if(tokens.nextIsnt(TokenType.TYPE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_TYPE);
    const dot = tokens.read();
    const output = parseType(tokens);

    return new FunctionType(fun, open, input, close, dot, output);

}

/** CUSTOM_TYPE :: • TYPE_VARS ( BIND* ) BLOCK */
function parseCustomType(tokens: Tokens): CustomType | Unparsable {

    const type = tokens.read();
 
    const typeVars = tokens.nextIs(TokenType.TYPE_VARS) ? parseTypeVariables(tokens) : undefined;
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    const block = parseBlock(false, tokens);

    return new CustomType(type, open, inputs, close, block, typeVars);

}

function parseDocs(tokens: Tokens): Docs[]  {

    const docs = [];
    while(tokens.nextIs(TokenType.DOCS)) {
        const doc = tokens.read();
        const lang = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
        docs.push(new Docs(doc, lang));
    }
    return docs;

}