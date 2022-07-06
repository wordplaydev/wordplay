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
    EXPECTED_TEXT_CLOSE
}

class Tokens {
    readonly tokens: Token[];
    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    /** Returns the text of the next token */
    peek(): string | undefined {
        return this.hasNext() ? this.tokens[0].text : undefined
    }

    /** Returns true if the token list isn't empty. */
    hasNext(): boolean {
        return this.tokens.length > 0;
    }

    /** Returns true if and only if the next token is the specified type. */
    nextIs(type: TokenType): boolean {
        return this.hasNext() && this.tokens[0].is(type);
    }

    /** Returns true if and only if there is a next token and it's not the specified type. */
    nextIsnt(type: TokenType): boolean {
        return this.hasNext() && this.tokens[0].isnt(type);
    }
    
    /** Returns true if and only if the next series of tokens matches the series of given token types. */
    nextAre(...types: TokenType[]) {
        return types.every((type, index) => index < this.tokens.length && this.tokens[index].is(type));
    }

    nextIsOneOf(...types: TokenType[]): boolean {
        return types.find(type => this.nextIs(type)) !== undefined;
    }

    /** Returns a token list without the first token. */
    consume(): Token {
        if(this.hasNext())
            return this.tokens.shift() as Token;
        else
            return new Token("", [ TokenType.END ]);
    }

    /** Returns a token list without all of the tokens until the next line or the end of the list. */
    consumeUnparsable(reason: ErrorMessage): Unparsable {
        const index = this.tokens.findIndex(t => t.is(TokenType.LINES));
        return new Unparsable(reason, this.tokens.splice(0, index < 0 ? this.tokens.length : index));
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
        tokens.consume();

    const borrows = [];
    while(tokens.nextIs(TokenType.BORROW))
        borrows.push(parseBorrow(tokens));

    // Consume some more lines.
    if(tokens.nextIs(TokenType.LINES))
        tokens.consume();

    const block = parseBlock(false, tokens);

    return new Program(borrows, block);

}

// BORROW :: borrow name number?
export function parseBorrow(tokens: Tokens): Borrow | Unparsable {
    let borrow;
    let name;
    let version;
    if(tokens.nextIs(TokenType.BORROW))
        borrow = tokens.consume();
    else 
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_BORROW);

    if(tokens.nextIs(TokenType.NAME))
        name = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_NAME);

    if(tokens.nextIs(TokenType.NUMBER))
        version = tokens.consume();

    return new Borrow(borrow, name, version);
}

/** BLOCK :: EXPR_OPEN? LINES (BIND|EXPRESSION) LINES EXPR_CLOSE? */
export function parseBlock(expectParentheses: boolean, tokens: Tokens): Block {
    let open;
    let close;
    let statements = [];

    if(expectParentheses) {
        open = tokens.nextIs(TokenType.EVAL_OPEN) ? 
            tokens.consume() :
            tokens.consumeUnparsable(ErrorMessage.EXPECTED_EVAL_OPEN);
        if(tokens.nextIs(TokenType.LINES))
            tokens.consume();
        else
            tokens.consumeUnparsable(ErrorMessage.EXPECTED_LINES);
    }

    while(tokens.nextIsnt(TokenType.EVAL_CLOSE)) {
        if(tokens.nextAre(TokenType.NAME, TokenType.BIND) || tokens.nextAre(TokenType.NAME, TokenType.TYPE))
            statements.push(parseBind(tokens))
        else
            statements.push(parseExpression(tokens));
        if(tokens.nextIs(TokenType.LINES))
            tokens.consume();
        else if(tokens.hasNext())
            statements.push(tokens.consumeUnparsable(ErrorMessage.EXPECTED_LINES))
    }

    if(expectParentheses) {
        close = tokens.nextIs(TokenType.EVAL_CLOSE) ? 
            tokens.consume() :
            tokens.consumeUnparsable(ErrorMessage.EXPECTED_EVAL_CLOSE);
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
        // Literal tokens
        tokens.nextIsOneOf(TokenType.NAME, TokenType.NUMBER, TokenType.BOOLEAN, TokenType.TEXT) ? tokens.consume() :
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
        (tokens.nextIs(TokenType.UNARY)) ? new UnaryOperation(tokens.consume(), parseExpression(tokens)) :
        // Anything that doesn't is unparsable.
        tokens.consumeUnparsable(ErrorMessage.EXPECTED_EXPRESSION)
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
        const operator = tokens.consume();
        const right = parseExpression(tokens);
        left = new BinaryOperation(operator, left, right);
    }

    // Return the beautiful tree we built.
    return left;

}

function parseParenthetical(tokens: Tokens): Parenthetical | Unparsable {
    let open;
    let close;
    if(tokens.nextIs(TokenType.EVAL_OPEN))
        open = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_EVAL_OPEN);

    const value = parseExpression(tokens);
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_EVAL_CLOSE);

    return new Parenthetical(open, value, close);

}

function parseAccess(left: Expression, tokens: Tokens): Expression | Unparsable {
    if(!tokens.nextIs(TokenType.ACCESS))
        return left;
    do {

        const access = tokens.consume();
        let name;
        if(tokens.nextIs(TokenType.NAME))
            name = tokens.consume();
        else return tokens.consumeUnparsable(ErrorMessage.EXPECTED_ACCESS_NAME);

        left = new AccessName(left, access, name);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEval(left, tokens);

    } while(tokens.nextIs(TokenType.ACCESS));

    // Return the series of accesses and evaluatios we created.
    return left;
}

function parseEval(left: Expression, tokens: Tokens): Evaluate | Unparsable {

    const open = tokens.consume();
    const objects = [];
    let close;
    
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        objects.push(parseExpression(tokens));
    
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_EVAL_OPEN);
    
    return new Evaluate(open, left, objects, close);    

}

function parseDelimited<T extends Expression | Bind>(tokens: Tokens, openType: TokenType, closeType: TokenType, openError: ErrorMessage, closeError: ErrorMessage, bind: boolean): Unparsable | [ Token, (T|Unparsable)[], Token ] {

    let open;
    let values: (T|Unparsable)[] = [];
    let close;

    if(tokens.nextIs(openType))
        open = tokens.consume();
    else
        return tokens.consumeUnparsable(openError);

    while(tokens.nextIs(TokenType.LINES))
        tokens.consume();

    while(tokens.nextIsnt(closeType)) {
        values.push((bind ? parseBind(tokens) : parseExpression(tokens)) as T|Unparsable);
        while(tokens.nextIs(TokenType.LINES))
           tokens.consume();
    }

    if(tokens.nextIs(closeType))
        close = tokens.consume();
    else
        return tokens.consumeUnparsable(closeError);

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
        name = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_MAP_NAME);

    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.consume();
        type = parseType(tokens);
    }

    if(tokens.nextIs(TokenType.BIND))
        colon = tokens.consume();
    else
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_NAME_BIND);

    value = parseExpression(tokens);

    return new Bind(name, colon, value, dot, type);

}

function parseTemplate(tokens: Tokens): Template | Unparsable {

    const parts = [];

    if(!tokens.nextIs(TokenType.TEXT_OPEN))
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_TEXT_OPEN);
    parts.push(tokens.consume());

    do {
        const expression = parseExpression(tokens);
        if(expression instanceof Unparsable) return expression;
        parts.push(expression);
        if(tokens.nextIs(TokenType.TEXT_BETWEEN))
            parts.push(tokens.consume());
    } while(tokens.nextIsnt(TokenType.TEXT_CLOSE));

    if(!tokens.nextIs(TokenType.TEXT_CLOSE))
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_TEXT_CLOSE);
    parts.push(tokens.consume());

    return new Template(parts);

}

/** TYPE :: 
 *    ?
 *    " 
 *    # 
 *    ! 
 *    {TYPE}
 *    [TYPE]
 *    <TYPE>
 *    TYPE | TYPE
 * */
function parseType(tokens: Tokens): Type | Unparsable {
    let left: Type = (
        tokens.nextIsOneOf(TokenType.PRIMITIVE, TokenType.ERROR, TokenType.NAME) ? new PrimitiveType(tokens.consume()) :
        tokens.nextIsOneOf(TokenType.LIST_OPEN, TokenType.SET_OPEN, TokenType.MAP_OPEN) ? parseCompoundType(tokens) :
        tokens.consumeUnparsable(ErrorMessage.EXPECTED_TYPE)
    );

    while(tokens.nextIs(TokenType.UNION))
        left = new UnionType(left, tokens.consume(), parseType(tokens));
    
    return left;

}

function parseCompoundType(tokens: Tokens): CompoundType | Unparsable {
    const open = tokens.consume();
    const type = parseType(tokens);
    if(open.is(TokenType.LIST_OPEN) && tokens.nextIsnt(TokenType.LIST_CLOSE))
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_LIST_CLOSE);
    if(open.is(TokenType.SET_OPEN) && tokens.nextIsnt(TokenType.SET_CLOSE))
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_SET_CLOSE);
    if(open.is(TokenType.MAP_OPEN) && tokens.nextIsnt(TokenType.MAP_CLOSE))
        return tokens.consumeUnparsable(ErrorMessage.EXPECTED_MAP_CLOSE);
    const close = tokens.consume();
    return new CompoundType(open, type, close);
}