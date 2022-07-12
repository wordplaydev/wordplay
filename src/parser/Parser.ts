import { tokenize } from "./Tokenizer";
import { Token, TokenType } from "./Token";

import type Expression from "./Expression";
import type Type from "./Type";

import Program from "./Program";
import Borrow from "./Borrow";
import Unparsable from "./Unparsable";
import Block from "./Block";
import List from "./List";
import Bind from "./Bind";
import Evaluate from "./Evaluate";
import UnaryOperation from "./UnaryOperation";
import BinaryOperation from "./BinaryOperation";
import AccessName from "./AccessName";
import Function from "./Function";
import Template from "./Template";
import UnionType from "./UnionType";
import None from "./None";
import Measurement from "./Measurement";
import MeasurementType from "./MeasurementType";
import Text from "./Text";
import NameType from "./NameType";
import NoneType from "./NoneType";
import TextType from "./TextType";
import ListType from "./ListType";
import SetOrMapType from "./SetOrMapType";
import FunctionType from "./FunctionType";
import TypeVariable from "./TypeVariable";
import KeyValue from "./KeyValue";
import ListAccess from "./ListAccess";
import Conditional from "./Conditional";
import Share from "./Share";
import CustomType from "./CustomType";
import Documented from "./Documented";
import Alias from "./Alias";
import Docs from "./Docs";
import Column from "./Column";
import Cell from "./Cell";
import Row from "./Row";
import Table from "./Table";
import ColumnType from "./ColumnType";
import TableType from "./TableType";
import Select from "./Select";
import Insert from "./Insert";
import Update from "./Update";
import Delete from "./Delete";
import Conversion from "./Conversion";
import Stream from "./Stream";
import StreamType from "./StreamType";
import BooleanType from "./BooleanType";
import SetAccess from "./SetAccess";
import Name from "./Name";
import Bool from "./Bool";
import Convert from "./Convert";
import SetOrMap from "./SetOrMap";

export enum SyntacticConflict {
    EXPECTED_BORRW_NAME,
    EXPECTED_BIND_NAME,
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
    EXPECTED_EXPRESSION,
    EXPECTED_TYPE
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

    nextIsBind() { return this.beforeNextLineIs(TokenType.BIND); }

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
            if(!token.is(TokenType.DOCS) && !token.is(TokenType.NAME)) return false;
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
    read(): Token {
        if(this.hasNext()) {
            const token = this.#unread.shift() as Token;
            this.#read.push(token);
            return token;
        }
        else
            return new Token("", [ TokenType.END ], this.#read.length === 0 ? 0 : this.#read[this.#read.length - 1].getIndex() + this.#read[this.#read.length - 1].getLength());
    }

    /** Returns a node annotated with an error message, as well as all surrounding tokens. */
    readUnparsableLine(reason: SyntacticConflict): Unparsable {
        // Find all of the tokens on the previous line for context.
        const indexOfLineBefore = this.#read.length - 1 - this.#read.slice().reverse().findIndex(t => t.hasPrecedingLineBreak());
        const tokensBefore = indexOfLineBefore >= this.#read.length ? [] : this.#read.slice(indexOfLineBefore);
        // Find all of the tokens before the next line break, include them
        const indexOfNextAfter = this.#unread.findIndex(t => t.hasPrecedingLineBreak());
        return new Unparsable(reason, tokensBefore, this.#unread.splice(0, indexOfNextAfter < 1 ? this.#unread.length : indexOfNextAfter));
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
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_BORRW_NAME);

    if(tokens.nextIs(TokenType.NUMBER))
        version = tokens.read();

    return new Borrow(borrow, name, version);
}

function parseShare(tokens: Tokens): Share {

    const share = tokens.read();
    const bind = parseBind(true, tokens);
    return new Share(share, bind);

}

/** BLOCK :: DOCS ? ( [BIND|EXPRESSION]+ )  */
export function parseBlock(root: boolean, tokens: Tokens): Block | Unparsable {

    // Grab any documentation
    let docs = parseDocs(tokens);

    const open = root ? 
        undefined :
        tokens.nextIs(TokenType.EVAL_OPEN) ? 
            tokens.read() :
            tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN);

    const statements = [];
    while(tokens.nextIsnt(TokenType.END) && tokens.nextIsnt(TokenType.EVAL_CLOSE))
        statements.push(
            tokens.nextIs(TokenType.SHARE) ? parseShare(tokens) :
            tokens.nextIsBind() ? parseBind(true, tokens) :
            parseExpression(tokens)
        );

    const close = root ?
        undefined :
        tokens.nextIs(TokenType.EVAL_CLOSE) ? 
            tokens.read() :
            tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE);

    return new Block(docs, statements, open, close);

}

/** BIND :: (NAME/LANGUAGE)+ TYPE? (: EXPRESSION)? */
export function parseBind(expectExpression: boolean, tokens: Tokens): Bind | Unparsable {

    let docs = parseDocs(tokens);
    let names = [];
    let colon;
    let value;
    let dot;
    let type;
    
    while((names.length === 0 && tokens.nextIs(TokenType.NAME)) || tokens.nextIs(TokenType.ALIAS)) {
        const alias = tokens.nextIs(TokenType.ALIAS) ? tokens.read() : undefined;
        const name = tokens.read();
        const slash = tokens.nextIs(TokenType.LANGUAGE) ? tokens.read() : undefined;
        const lang = slash ? tokens.read() : undefined;
        names.push(new Alias(name, alias, slash, lang));
    }
    if(names.length === 0)
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_BIND_NAME);

    if(tokens.nextIs(TokenType.TYPE)) {
        dot = tokens.read();
        type = parseType(tokens);
    }

    if(expectExpression && tokens.nextIs(TokenType.BIND)) {
        colon = tokens.read(); 
        value = parseExpression(tokens);
    }

    return new Bind(docs, names, dot, type, colon, value);

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
export function parseExpression(tokens: Tokens): Expression | Unparsable {

    // Is this expression excluded?
    const docs = tokens.nextIsOneOf(
        TokenType.NONE, 
        TokenType.NAME, 
        TokenType.BOOLEAN, 
        TokenType.TEXT, 
        TokenType.TEXT_OPEN, 
        TokenType.LIST_OPEN, 
        TokenType.SET_OPEN, 
        TokenType.TABLE,
        TokenType.UNARY_OP) ? parseDocs(tokens) : undefined;
    
    // All expressions must start with one of the following
    let left: Expression | Unparsable = (
        // Nones
        tokens.nextIs(TokenType.NONE) ? parseNone(tokens): 
        // Names or booleans are easy
        tokens.nextIs(TokenType.NAME) ? new Name(tokens.read()) :
        // Booleans
        tokens.nextIs(TokenType.BOOLEAN) ? new Bool(tokens.read()) :
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
        tokens.nextIs(TokenType.TABLE) ? parseTable(tokens) :
        // A block expression
        tokens.nextAreDocsThen(TokenType.EVAL_OPEN) ? parseBlock(false, tokens) :
        // Custom types
        tokens.nextAreDocsThen(TokenType.TYPE) ? parseCustomType(tokens) :
        // A function
        tokens.nextAreDocsThen(TokenType.FUNCTION) ? parseFunction(tokens) :
        // A conversion
        tokens.nextAreDocsThen(TokenType.CONVERT) ? parseConversion(tokens) :
        // Unary expressions!
        tokens.nextIs(TokenType.UNARY_OP) ? new UnaryOperation(tokens.read(), parseExpression(tokens)) :
        // Anything that doesn't is unparsable.
        tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EXPRESSION)
    );

    // But wait! Is it one or more accessors? Slurp them up.
    while(!(left instanceof Unparsable)) {
        if(tokens.nextIs(TokenType.ACCESS))
            left = parseAccess(left, tokens);
        else if(tokens.nextIs(TokenType.LIST_OPEN))
            left = parseListAccess(left, tokens);
        else if(tokens.nextIs(TokenType.SET_OPEN))
            left = parseSetOrMapAccess(left, tokens);
        else if(tokens.nextIsOneOf(TokenType.EVAL_OPEN, TokenType.TYPE) && tokens.nextLacksPrecedingLineBreak())
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
        else if(tokens.nextIs(TokenType.BINARY_OP))
            left = parseBinaryOperation(left, tokens);
        else if(tokens.nextIs(TokenType.STREAM))
            left = parseStream(left, tokens);
        else break;
    }
    
    // Is it conditional statement?
    if(!(left instanceof Unparsable) && tokens.nextIs(TokenType.CONDITIONAL))
        left = parseConditional(left, tokens);

    // Is the expression excluded? Wrap it.
    if(docs !== undefined && docs.length > 0)
        left = new Documented(docs, left);

    // Return the beautiful tree we built.
    return left;

}

/** NONE :: ! name? */
function parseNone(tokens: Tokens): None | Unparsable {

    const error = tokens.read();
    const name = tokens.nextIs(TokenType.NAME) ? tokens.read() : undefined;
    return new None(error, name);

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

/** TEXT :: text name? */
function parseText(tokens: Tokens): Text {

    const text = tokens.read();
    let format;
    if(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
        format = tokens.read();
    return new Text(text, format);

}

/** TEMPLATE :: text_open ( EXPRESSION text_between )* EXPRESSION text_close name? */
function parseTemplate(tokens: Tokens): Template | Unparsable {

    const parts = [];
    let format;

    if(!tokens.nextIs(TokenType.TEXT_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TEXT_OPEN);
    parts.push(tokens.read());

    do {
        const expression = parseExpression(tokens);
        if(expression instanceof Unparsable) return expression;
        parts.push(expression);
        if(tokens.nextIs(TokenType.TEXT_BETWEEN))
            parts.push(tokens.read());
    } while(tokens.nextIsnt(TokenType.TEXT_CLOSE));

    if(!tokens.nextIs(TokenType.TEXT_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TEXT_CLOSE);
    parts.push(tokens.read());

    // Read an optional format if there's no preceding space.
    if(tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace())
        format = tokens.read();

    return new Template(parts, format);

}

/** LIST :: [ EXPRESSION* ] */
function parseList(tokens: Tokens): List | Unparsable {

    let open = tokens.read();
    let values: (Expression|Unparsable)[] = [];
    let close;

    while(tokens.nextIsnt(TokenType.LIST_CLOSE))
        values.push(parseExpression(tokens));

    if(tokens.nextIs(TokenType.LIST_CLOSE))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_LIST_CLOSE);

    return new List(open, values, close);

}

/** LIST_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseListAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read();
        const index = parseExpression(tokens);
        if(tokens.nextIsnt(TokenType.LIST_CLOSE))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_LIST_CLOSE);
        const close = tokens.read();

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.LIST_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** SET :: { EXPRESSION* } | { (EXPRESSION:EXPRESSION)* } */
function parseSetOrMap(tokens: Tokens): SetOrMap | Unparsable {

    let open = tokens.read();
    let values: (Expression|KeyValue|Unparsable)[] = [];
    let close;

    while(tokens.nextIsnt(TokenType.SET_CLOSE)) {
        const key = parseExpression(tokens);
        if(tokens.nextIs(TokenType.BIND)) {
            const bind = tokens.read();            
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, bind, value))
        }
        else values.push(key);
    }

    if(tokens.nextIs(TokenType.SET_CLOSE))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_SET_CLOSE);

    return new SetOrMap(open, values, close);

}

/** SET_ACCESS :: EXPRESSION ([ EXPRESSION ])+ */
function parseSetOrMapAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    do {

        const open = tokens.read();
        const key = parseExpression(tokens);

        if(tokens.nextIsnt(TokenType.SET_CLOSE))
            return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_SET_CLOSE);
        const close = tokens.read();

        left = new SetAccess(left, open, key, close);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.SET_OPEN));

    // Return the series of accesses and evaluations we created.
    return left;
}

function parseTable(tokens: Tokens): Table {

    // Read the column definitions. Stop when we see a newline.
    const columns = [];
    while(tokens.nextIs(TokenType.TABLE)) {
        const cell = tokens.read();
        const bind = parseBind(true, tokens);
        columns.push(new Column(cell, bind));
        if(tokens.nextHasPrecedingLineBreak())
            break;
    }

    // Read the rows.
    const rows = [];
    while(tokens.nextIs(TokenType.TABLE))
        rows.push(parseRow(tokens));

    return new Table(columns, rows);

}

/** ROW :: [| (BIND|EXPRESSION)]+ */
function parseRow(tokens: Tokens): Row {

    const cells = [];
    // Read the cells.
    while(tokens.nextIs(TokenType.TABLE)) {
        const cell = tokens.read();
        const value = tokens.nextIsBind() ? parseBind(true, tokens) : parseExpression(tokens);
        cells.push(new Cell(cell, value));
        if(tokens.nextHasPrecedingLineBreak())
            break;
    }
    return new Row(cells);

}

/** SELECT :: EXPRESSION |? ROW EXPRESSION */
function parseSelect(table: Expression, tokens: Tokens): Select {

    const select = tokens.read();
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Select(table, select, row, query);

}

/** INSERT :: EXPRESSION |+ ROW */
function parseInsert(table: Expression, tokens: Tokens): Insert {

    const insert = tokens.read();
    const row = parseRow(tokens);

    return new Insert(table, insert, row);
    
}

/** UPDATE :: EXPRESSION |: ROW EXPRESSION */
function parseUpdate(table: Expression, tokens: Tokens): Update {

    const update = tokens.read();
    const row = parseRow(tokens);
    const query = parseExpression(tokens);

    return new Update(table, update, row, query);
    
}

/** DELETE :: EXPRESSION |- EXPRESSION */
function parseDelete(table: Expression, tokens: Tokens): Delete {

    const del = tokens.read();
    const query = parseExpression(tokens);

    return new Delete(table, del, query);
    
}

/** STREAM :: EXPRESSION ∆ EXPRESSION EXPRESSION */
function parseStream(initial: Expression, tokens: Tokens): Stream {
    const delta = tokens.read();
    const stream = parseExpression(tokens);
    const next = parseExpression(tokens);
    return new Stream(initial, delta, stream, next); 
}

/** BINARY_OP :: EXPRESSION binary_op EXPRESSION */
function parseBinaryOperation(left: Expression, tokens: Tokens): BinaryOperation {
    const operator = tokens.read();
    const right = parseExpression(tokens);
    return new BinaryOperation(operator, left, right); 
}

/** CONDITIONAL :: EXPRESSSION ? EXPRESSION EXPRESSION */
function parseConditional(condition: Expression, tokens: Tokens): Conditional {
    const conditional = tokens.read();
    const yes = parseExpression(tokens);
    const no = parseExpression(tokens);
    return new Conditional(condition, conditional, yes, no);

}

/** FUNCTION :: DOCS? ƒ TYPE_VARIABLES? ( BIND* ) (•TYPE)? EXPRESSION */
function parseFunction(tokens: Tokens): Function | Unparsable {

    const docs = parseDocs(tokens);

    const fun = tokens.read();

    const typeVars = parseTypeVariables(tokens);

    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(true, tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    let type;
    let output;
    if(tokens.nextIs(TokenType.TYPE)) {
        type = tokens.read();
        output = parseType(tokens);
    }

    const expression = tokens.nextIs(TokenType.TBD) ? tokens.read() : parseExpression(tokens);

    return new Function(docs, fun, open, inputs, close, expression, typeVars, type, output);

}

/** EVAL :: EXPRESSION TYPE_VARS? (EXPRESSION*) */
function parseEvaluate(left: Expression | Unparsable, tokens: Tokens): Evaluate | Unparsable {

    const typeVars = parseTypeVariables(tokens);
    const open = tokens.read();
    const inputs = [];
    let close;
    
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(tokens.nextIsBind() ? parseBind(true, tokens) : parseExpression(tokens));
    
    if(tokens.nextIs(TokenType.EVAL_CLOSE))
        close = tokens.read();
    else
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN);
    
    return new Evaluate(typeVars, open, left, inputs, close);

}

/** CONVERSION :: DOCS? → TYPE EXPRESSION */
function parseConversion(tokens: Tokens): Conversion {

    const docs = parseDocs(tokens);
    const convert = tokens.read();
    const output = parseType(tokens);
    const expression = parseExpression(tokens);

    return new Conversion(docs, convert, output, expression);

}

/** CONVERT :: EXPRESSION CONVERT TYPE */
function parseConvert(expression: Expression, tokens: Tokens): Convert {

    const type = parseType(tokens);
        
    return new Convert(expression, type);

}

/** TYPE_VARS :: [•NAME]* */
function parseTypeVariables(tokens: Tokens): (TypeVariable|Unparsable)[] {

    const vars = [];
    while(tokens.nextIs(TokenType.TYPE)) {
        const type = tokens.read();
        if(tokens.nextIsnt(TokenType.NAME)) {
            vars.push(tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TYPE_VAR_NAME));
            return vars;
        }
        const name = tokens.read();
        vars.push(new TypeVariable(type, name));
    }
    return vars;

}

/** ACCESS :: EXPRESSION (.NAME)+ */
function parseAccess(left: Expression | Unparsable, tokens: Tokens): Expression | Unparsable {
    if(!tokens.nextIs(TokenType.ACCESS))
        return left;
    do {

        const access = tokens.read();
        let name;
        if(tokens.nextIs(TokenType.NAME))
            name = tokens.read();
        else return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_ACCESS_NAME);

        left = new AccessName(left, access, name);

        // But wait, is it a function evaluation?
        if(tokens.nextIs(TokenType.EVAL_OPEN))
            left = parseEvaluate(left, tokens);

    } while(tokens.nextIs(TokenType.ACCESS));

    // Return the series of accesses and evaluations we created.
    return left;
}

/** TYPE :: (? | name | MEASUREMENT_TYPE | TEXT_TYPE | NONE_TYPE | LIST_TYPE | SET_TYPE | FUNCTION_TYPE | STREAM_TYPE) (∨ TYPE)* */
export function parseType(tokens: Tokens): Type | Unparsable {
    let left: Type | Unparsable = (
        tokens.nextIs(TokenType.NAME) ? new NameType(tokens.read()) :
        tokens.nextIs(TokenType.BOOLEAN_TYPE) ? new BooleanType(tokens.read()) :
        tokens.nextIs(TokenType.NUMBER_TYPE) ? parseMeasurementType(tokens) :
        tokens.nextIs(TokenType.TEXT_TYPE) ? parseTextType(tokens) :
        tokens.nextIs(TokenType.NONE) ? parseNoneType(tokens) :
        tokens.nextIs(TokenType.LIST_OPEN) ? parseListType(tokens) :
        tokens.nextIs(TokenType.SET_OPEN) ? parseSetOrMapType(tokens) :
        tokens.nextIs(TokenType.TABLE) ? parseTableType(tokens) :
        tokens.nextIs(TokenType.FUNCTION) ? parseFunctionType(tokens) :
        tokens.nextIs(TokenType.STREAM) ? parseStreamType(tokens) :
        tokens.readUnparsableLine(SyntacticConflict.EXPECTED_TYPE)
    );

    while(!(left instanceof Unparsable) && tokens.nextIs(TokenType.UNION))
        left = new UnionType(left, tokens.read(), parseType(tokens));
    
    return left;

}

/** TEXT_TYPE :: text_type NAME? */
function parseTextType(tokens: Tokens): TextType {

    const quote = tokens.read();
    const format = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new TextType(quote, format);

}

/** NUMBER_TYPE :: #NAME? */
function parseMeasurementType(tokens: Tokens): MeasurementType {

    const number = tokens.read();
    const unit = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new MeasurementType(number, unit);

}

/** NONE_TYPE :: !NAME? */
function parseNoneType(tokens: Tokens): NoneType {

    const oops = tokens.read();
    const name = tokens.nextIs(TokenType.NAME) && tokens.nextLacksPrecedingSpace() ? tokens.read() : undefined;
    return new NoneType(oops, name);

}

/** STREAM_TYPE :: ∆ TYPE */
function parseStreamType(tokens: Tokens): StreamType {

    const dots = tokens.read();
    const type = parseType(tokens);
    return new StreamType(dots, type);

}

/** LIST_TYPE :: [ TYPE ] */
function parseListType(tokens: Tokens): ListType | Unparsable {

    const open = tokens.read();
    const type = parseType(tokens);
    if(tokens.nextIsnt(TokenType.LIST_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_LIST_CLOSE);
    const close = tokens.read();
    return new ListType(type, open, close);    

}

/** SET_TYPE :: { TYPE } | { TYPE:TYPE } */
function parseSetOrMapType(tokens: Tokens): SetOrMapType | Unparsable {

    const open = tokens.read();
    const key = parseType(tokens);
    const bind = tokens.nextIs(TokenType.BIND) ? tokens.read() : undefined;
    const value = bind !== undefined ? parseType(tokens) : undefined;
    if(tokens.nextIsnt(TokenType.SET_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_SET_CLOSE);
    const close = tokens.read();
    return new SetOrMapType(key, value, open, close, bind);

}

/** TABLE_TYPE :: (| BIND)+ */
function parseTableType(tokens: Tokens): TableType | Unparsable {

    const columns = [];
    while(tokens.nextIs(TokenType.TABLE)) {
        const bar = tokens.read();
        const bind = parseBind(false, tokens);
        columns.push(new ColumnType(bind, bar))
    }
    return new TableType(columns);

}

/** FUNCTION_TYPE :: ƒ(TYPE*) TYPE */
function parseFunctionType(tokens: Tokens): FunctionType | Unparsable {

    const fun = tokens.read();
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const inputs = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseType(tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    const output = parseType(tokens);

    return new FunctionType(inputs, output, fun, open, close);

}

/** CUSTOM_TYPE :: DOCS? • TYPE_VARS ( BIND* ) BLOCK */
function parseCustomType(tokens: Tokens): CustomType | Unparsable {

    const docs = parseDocs(tokens);

    const type = tokens.read();
 
    const typeVars = parseTypeVariables(tokens);
    if(tokens.nextIsnt(TokenType.EVAL_OPEN))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_OPEN);
    const open = tokens.read();

    const inputs: (Bind|Unparsable)[] = [];
    while(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        inputs.push(parseBind(true, tokens));

    if(tokens.nextIsnt(TokenType.EVAL_CLOSE))
        return tokens.readUnparsableLine(SyntacticConflict.EXPECTED_EVAL_CLOSE);
    const close = tokens.read();

    const block = parseBlock(false, tokens);

    return new CustomType(docs, type, typeVars, open, inputs, close, block);

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