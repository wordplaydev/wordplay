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
import Oops from "./Oops";
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

export enum ErrorMessage {
    EXPECTED_BORROW,
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

    nextIsOneOf(...types: TokenType[]): boolean {
        return types.find(type => this.nextIs(type)) !== undefined;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextLacksPrecedingSpace(): boolean {
        return this.hasNext() && !this.#unread[0].hasPrecedingSpace();
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
        const index = this.#unread.findIndex(t => t.is(TokenType.LINES));
        return new Unparsable(reason, this.#unread.splice(0, index < 0 ? this.#unread.length : index));
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

    // Consume some lines.
    if(tokens.nextIs(TokenType.LINES))
        tokens.read();

    const borrows = [];
    while(tokens.nextIs(TokenType.BORROW))
        borrows.push(parseBorrow(tokens));

    // Consume some more lines.
    if(tokens.nextIs(TokenType.LINES))
        tokens.read();

    const block = parseBlock(false, tokens);

    return new Program(borrows, block);

}

// BORROW :: borrow name number?
export function parseBorrow(tokens: Tokens): Borrow | Unparsable {
    let borrow;
    let name;
    let version;
    if(tokens.nextIs(TokenType.BORROW))
        borrow = tokens.read();
    else 
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_BORROW);

    if(tokens.nextIs(TokenType.NAME))
        name = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_NAME);

    if(tokens.nextIs(TokenType.NUMBER))
        version = tokens.read();

    return new Borrow(borrow, name, version);
}

/** BLOCK :: EXPR_OPEN? LINES (BIND|EXPRESSION) LINES EXPR_CLOSE? */
export function parseBlock(expectParentheses: boolean, tokens: Tokens): Block {
    let open;
    let close;
    let statements = [];

    if(expectParentheses) {
        open = tokens.nextIs(TokenType.EVAL_OPEN) ? 
            tokens.read() :
            tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_OPEN);
        if(tokens.nextIs(TokenType.LINES))
            tokens.read();
        else
            tokens.readUnparsableLine(ErrorMessage.EXPECTED_LINES);
    }

    while(tokens.nextIsnt(TokenType.EVAL_CLOSE)) {
        if(tokens.nextAre(TokenType.NAME, TokenType.BIND) || tokens.nextAre(TokenType.NAME, TokenType.TYPE))
            statements.push(parseBind(tokens))
        else
            statements.push(parseExpression(tokens));
        if(tokens.nextIs(TokenType.LINES))
            tokens.read();
        else if(tokens.hasNext())
            statements.push(tokens.readUnparsableLine(ErrorMessage.EXPECTED_LINES))
    }

    if(expectParentheses) {
        close = tokens.nextIs(TokenType.EVAL_CLOSE) ? 
            tokens.read() :
            tokens.readUnparsableLine(ErrorMessage.EXPECTED_EVAL_CLOSE);
    }

    return new Block(statements, open, close);

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

    // All expressions must start with one of the following
    let left: Expression = (
        // Numbers with units
        tokens.nextIs(TokenType.NUMBER) ? parseMeasurement(tokens) :
        // Text with optional formats
        tokens.nextIs(TokenType.TEXT) ? parseText(tokens) :
        // Literal tokens
        tokens.nextIsOneOf(TokenType.NAME, TokenType.BOOLEAN) ? tokens.read() :
        // Errors
        tokens.nextIs(TokenType.OOPS) ? parseOops(tokens): 
        // A block
        tokens.nextAre(TokenType.EVAL_OPEN, TokenType.LINES) ? parseBlock(true, tokens) :
        // A function
        tokens.nextIs(TokenType.FUNCTION) ? parseFunction(tokens) :
        // A parenthetical
        tokens.nextAre(TokenType.EVAL_OPEN) ? parseParenthetical(tokens) :
        // A list
        tokens.nextIs(TokenType.LIST_OPEN) ? parseList(tokens) :
        // A set
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetOrMap(tokens) :
        // A string template
        tokens.nextIs(TokenType.TEXT_OPEN) ? parseTemplate(tokens) :
        // Unary expressions!
        (tokens.nextIs(TokenType.UNARY)) ? new UnaryOperation(tokens.read(), parseExpression(tokens)) :
        // Anything that doesn't is unparsable.
        tokens.readUnparsableLine(ErrorMessage.EXPECTED_EXPRESSION)
    );

    // But wait! Is it one or more accessors? Slurp them up.
    if(tokens.nextIs(TokenType.ACCESS))
        left = parseAccess(left, tokens);
    // If not that, is it an evaluation with an accessor?
    else if(left instanceof Token && left.isName() && tokens.nextIs(TokenType.EVAL_OPEN))
        left = parseEval(left, tokens);

    // Finally, keep reading binary operators until we see no more. Order of operations is 
    // plain left to right; we rely on tools to warn about evaluation order.
    while(tokens.nextIs(TokenType.BINARY)) {
        const operator = tokens.read();
        const right = parseExpression(tokens);
        left = new BinaryOperation(operator, left, right);
    }

    // Return the beautiful tree we built.
    return left;

}

/** NUMBER :: number name? */
function parseMeasurement(tokens: Tokens): Measurement {

    const number = tokens.read();
    let unit;
    if(tokens.nextIs(TokenType.NAME)) {
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
    if(tokens.nextIs(TokenType.NAME))
        format = tokens.read();
    return new Text(text, format);

}

/** OOPS :: ! NAME? */
function parseOops(tokens: Tokens): Oops | Unparsable {

    const error = tokens.read();
    if(tokens.nextIs(TokenType.NAME)) {
        const name = tokens.read();
        return new Oops(error, name);
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

    return new Function(fun, open, inputs, close, expression, typeVars, type, output);

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

    while(tokens.nextIs(TokenType.LINES))
        tokens.read();

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
        while(tokens.nextIs(TokenType.LINES))
           tokens.read();
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

/** BIND :: name TYPE? : EXPRESSION */
function parseBind(tokens: Tokens): Bind | Unparsable {

    let name;
    let colon;
    let value;
    let dot;
    let type;

    if(tokens.nextIs(TokenType.NAME))
        name = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_MAP_NAME);

    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read();
        type = parseType(tokens);
    }

    if(tokens.nextIs(TokenType.BIND)) {
        colon = tokens.read(); 
        value = parseExpression(tokens);
    }

    return new Bind(name, colon, value, dot, type);

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

    // Read an optional format.
    if(tokens.nextIs(TokenType.NAME))
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
        tokens.nextIs(TokenType.OOPS) ? parseOopsType(tokens) :
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