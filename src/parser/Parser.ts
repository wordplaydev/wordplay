import Program from "./Program";
import Borrow from "./Borrow";
import { Token, TokenType } from "./Token";
import Unparsable from "./Unparsable";
import Block from "./Block";
import type Expression from "./Expression";
import List from "./List";
import SetNode from "./Set";
import MapNode from "./Map";
import Bind from "./Bind";
import type Type from "./Type";
import Evaluate from "./Evaluate";
import UnaryOperation from "./UnaryOperation";
import BinaryOperation from "./BinaryOperation";
import AccessName from "./AccessName";
import Parenthetical from "./Parenthetical";
import { tokenize } from "./Tokenizer";
import Template from "./Template";
import PrimitiveType from "./PrimitiveType";
import CompoundType from "./CompoundType";
import UnionType from "./UnionType";
import MapType from "./MapType";
import Oops from "./Oops";
import Measurement from "./Measurement";
import MeasurementType from "./MeasurementType";

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
    EXPECTED_UNIT
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
    return parseProgram(new Tokens(tokens.filter(t => !t.is(TokenType.SPACE))));
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
        // Literal tokens
        tokens.nextIsOneOf(TokenType.NAME, TokenType.BOOLEAN, TokenType.TEXT) ? tokens.read() :
        // Errors
        tokens.nextIs(TokenType.OOPS) ? parseOops(tokens): 
        // A block
        tokens.nextAre(TokenType.EVAL_OPEN, TokenType.LINES) ? parseBlock(true, tokens) :
        // A parenthetical
        tokens.nextAre(TokenType.EVAL_OPEN) ? parseParenthetical(tokens) :
        // A list
        tokens.nextIs(TokenType.LIST_OPEN) ? parseList(tokens) :
        // A set
        tokens.nextIs(TokenType.SET_OPEN) ? parseSet(tokens) :
        // A map
        tokens.nextIs(TokenType.MAP_OPEN) ? parseMap(tokens) :
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

function parseMeasurement(tokens: Tokens): Measurement | Unparsable {

    const number = tokens.read();
    let unit;
    if(tokens.nextIs(TokenType.NAME)) {
        unit = tokens.read();
    }
    return new Measurement(number, unit);

}

function parseOops(tokens: Tokens): Oops | Unparsable {

    const error = tokens.read();
    if(tokens.nextIs(TokenType.NAME)) {
        const name = tokens.read();
        return new Oops(error, name);
    }
    return tokens.readUnparsableLine(ErrorMessage.EXPECTED_ERROR_NAME);

}

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

function parseDelimited<T extends Expression | Bind>(tokens: Tokens, openType: TokenType, closeType: TokenType, openError: ErrorMessage, closeError: ErrorMessage, bind: boolean): Unparsable | [ Token, (T|Unparsable)[], Token ] {

    let open;
    let values: (T|Unparsable)[] = [];
    let close;

    if(tokens.nextIs(openType))
        open = tokens.read();
    else
        return tokens.readUnparsableLine(openError);

    while(tokens.nextIs(TokenType.LINES))
        tokens.read();

    while(tokens.nextIsnt(closeType)) {
        values.push((bind ? parseBind(tokens) : parseExpression(tokens)) as T|Unparsable);
        while(tokens.nextIs(TokenType.LINES))
           tokens.read();
    }

    if(tokens.nextIs(closeType))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(closeError);

    return [ open, values, close ];

}

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

function parseSet(tokens: Tokens): SetNode | Unparsable {

    const stuff = parseDelimited<Expression>(
        tokens, 
        TokenType.SET_OPEN, 
        TokenType.SET_CLOSE, 
        ErrorMessage.EXPECTED_SET_OPEN, 
        ErrorMessage.EXPECTED_SET_CLOSE, 
        false
    );
    return stuff instanceof Unparsable ? stuff : new SetNode(stuff[0], stuff[1], stuff[2]);

}

function parseMap(tokens: Tokens): MapNode | Unparsable {

    const stuff = parseDelimited<Bind>(
        tokens,
        TokenType.MAP_OPEN,
        TokenType.MAP_CLOSE,
        ErrorMessage.EXPECTED_MAP_OPEN,
        ErrorMessage.EXPECTED_MAP_CLOSE,
        true
    )
    return stuff instanceof Unparsable? stuff : new MapNode(stuff[0], stuff[1], stuff[2]);

}

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

    if(tokens.nextIs(TokenType.BIND))
        colon = tokens.read();
    else
        return tokens.readUnparsableLine(ErrorMessage.EXPECTED_NAME_BIND);

    value = parseExpression(tokens);

    return new Bind(name, colon, value, dot, type);

}

function parseTemplate(tokens: Tokens): Template | Unparsable {

    const parts = [];

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

    return new Template(parts);

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
        tokens.peek() === "#" ? parseMeasurementType(tokens) :
        tokens.nextIsOneOf(TokenType.PRIMITIVE, TokenType.OOPS, TokenType.NAME) ? new PrimitiveType(tokens.read()) :
        tokens.nextIsOneOf(TokenType.LIST_OPEN, TokenType.SET_OPEN, TokenType.MAP_OPEN) ? parseCompoundType(tokens) :
        tokens.readUnparsableLine(ErrorMessage.EXPECTED_TYPE)
    );

    while(tokens.nextIs(TokenType.UNION))
        left = new UnionType(left, tokens.read(), parseType(tokens));
    
    return left;

}

function parseMeasurementType(tokens: Tokens): Type {

    const number = tokens.read();
    const unit = tokens.nextIs(TokenType.NAME) ? tokens.read() : undefined;
    return new MeasurementType(number, unit);

}

function parseCompoundType(tokens: Tokens): CompoundType | MapType | Unparsable {
    const open = tokens.read();
    const type = parseType(tokens);
    if(open.is(TokenType.LIST_OPEN)) {
        if(tokens.nextIsnt(TokenType.LIST_CLOSE))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_LIST_CLOSE);
        const close = tokens.read();
        return new CompoundType(open, type, close);    
    }
    if(open.is(TokenType.SET_OPEN)) {
        if(tokens.nextIsnt(TokenType.SET_CLOSE))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_SET_CLOSE);
        const close = tokens.read();
        return new CompoundType(open, type, close);    
    }
    if(open.is(TokenType.MAP_OPEN)) {
        if(tokens.nextIsnt(TokenType.BIND))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_MAP_BIND);
        const bind = tokens.read();
        const value = parseType(tokens);
        if(tokens.nextIsnt(TokenType.MAP_CLOSE))
            return tokens.readUnparsableLine(ErrorMessage.EXPECTED_MAP_CLOSE);
        const close = tokens.read();
        return new MapType(open, type, bind, value, close);
    }
    return tokens.readUnparsableLine(ErrorMessage.EXPECTED_TYPE);
}