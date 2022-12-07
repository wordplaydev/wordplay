import type Node from "../nodes/Node";
import Token from "../nodes/Token";
import Program from "../nodes/Program";
import type Conflict from "../conflicts/Conflict";
import { parseProgram, Tokens } from "../parser/Parser";
import { tokenize } from "../parser/Tokenizer";
import UnicodeString from "./UnicodeString";
import type Value from "../runtime/Value";
import type Context from "../nodes/Context";
import TokenType from "../nodes/TokenType";
import Tree from "../nodes/Tree";
import Names from "../nodes/Names";
import type Borrow from "../nodes/Borrow";
import type Translations from "../nodes/Translations";
import type LanguageCode from "../nodes/LanguageCode";
import Expression from "../nodes/Expression";
import Bind from "../nodes/Bind";
import type Type from "../nodes/Type";
import type { TypeSet } from "../nodes/UnionType";
import type Step from "../runtime/Step";
import type Stream from "../runtime/Stream";
import type Transform from "../transforms/Transform";
import { WRITE_DOCS } from "../nodes/Translations";
import Name from "../nodes/Name";
import type { SharedDefinition } from "../nodes/Borrow";
import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import type Spaces from "../parser/Spaces";

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source extends Expression {

    readonly code: UnicodeString;

    /** The names of this source */
    readonly names: Names;

    /** The program this source can evaluate. */
    readonly expression: Program;

    /** The spaces preceding each token in the program. */
    readonly spaces: Spaces;
    
    /** Functions to call when a source's evaluator has an update. */
    readonly observers: Set<() => void> = new Set();

    /** An index of token positions in the source file. */
    readonly tokenPositions: Map<Token, number> = new Map();

    /** A tree representing the source's program. */
    readonly tree: Tree;

    /** An index of Trees by Node, for fast retrieval of tree structure by a Node. */
    _index: Map<Node, Tree | undefined> = new Map();

    constructor(names: string | Names, code: string | UnicodeString | [ Program, Spaces ]) {

        super();

        this.names = names instanceof Names ? names : new Names([new Name(names)]);

        if(typeof code === "string" || code instanceof UnicodeString) {
            // Generate the AST from the provided code.
            const tokens = tokenize(code instanceof UnicodeString ? code.getText() : code);
            this.expression = parseProgram(new Tokens(tokens.getTokens(), tokens.getSpaces()));            
            this.spaces = tokens.getSpaces().withRoot(this);
        }
        else {
            // Save the AST provided
            const [ program, spaces ] = code;
            this.expression = program;
            this.spaces = spaces;
        }

        // A facade for analyzing the tree.
        this.tree = new Tree(this);

        // Generate the text from the AST, which is responsible for pretty printing.
        this.code = new UnicodeString(this.expression.toWordplay(this.spaces));

        // Create an index of the token positions and space roots.
        let index = 0;
        for(const token of this.expression.nodes(n => n instanceof Token) as Token[]) {

            // Increment by the amount of space
            index += this.spaces.getSpace(token).length;
            // Remember the position.
            this.tokenPositions.set(token, index);
            // Increment by the amount of text.
            index += token.text.getLength();

        }

    }

    getGrammar() { 
        return [
            { name: "expression", types:[ Program ] },
        ]; 
    }

    isEvaluationInvolved() { return true; }
    isEvaluationRoot() { return true; }

    get(node: Node) { 
        // See if the cache has it.
        if(!this._index.has(node))
            this._index.set(node, this.tree.get(node));
        return this._index.get(node);    
    }

    hasName(name: string) { return this.names.hasName(name); }

    /** Returns a path from a borrow in this program this to this, if one exists. */
    getCycle(context: Context, path: Source[] = []): [ Borrow,  Source[] ] | undefined {

        // Visit this source.
        path.push(this);
        
        // Visit each borrow in the source's program to see if there's a path back here.
        for(const borrow of this.expression.borrows) {

            // Find the share.
            const [ source ] = borrow.getShare(context) ?? [];
            if(source) {
                // If we found a cycle, return the path.
                if(path.includes(source))
                    return [ borrow, path ];
                // Otherwise, continue searching for a cycle.
                const cycle = source.getCycle(context, path.slice());
                // If we found one, pass it up the call stack, but pass up this borrow instead
                if(cycle)
                    return [ borrow, cycle[1] ];
            }
        }

        // We made it without detecting a cycle; return undefined.
        return;

    }

    getNames() { return this.names.getNames(); }
    getCode() { return this.code; }
    
    getShare(name: string): SharedDefinition | undefined {

        return this.expression.expression.statements.find(n => 
            (n instanceof Bind && n.hasName(name) && n.isShared()) ||
            ((n instanceof FunctionDefinition || n instanceof StructureDefinition) && n.hasName(name))) as SharedDefinition | undefined;

    }

    withPreviousGraphemeReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : new Source(this.names, newCode);
    }

    withGraphemesAt(char: string, position: number) {
        const newCode = this.code.withGraphemesAt(char, position);
        return newCode == undefined ? undefined : new Source(this.names, newCode);
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : new Source(this.names, newCode);
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : new Source(this.names, newCode);
    }

    withCode(code: string) {
        return new Source(this.names, new UnicodeString(code));
    }

    withProgram(program: Program, spaces: Spaces) {
        return new Source(this.names, [ program, spaces ]);
    }

    replace() {
        return new Source(this.names, [ this.expression, this.spaces ]) as this;
    }

    getTokenTextPosition(token: Token) {
        const index = this.tokenPositions.get(token);
        if(index === undefined) 
            throw Error(`No index for ${token.toWordplay()}; it must not be in this source, which means there's a defect somewhere.`);
        return index;
    }

    getTokenSpacePosition(token: Token) { return this.getTokenTextPosition(token) - this.spaces.getSpace(token).length; }
    getTokenLastPosition(token: Token) { return this.getTokenTextPosition(token) + token.getTextLength(); }

    getTokenAt(position: number, includingWhitespace: boolean = true) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for(const [token, index] of this.tokenPositions) {
            if(position >= index - (includingWhitespace ? this.spaces.getSpace(token).length : 0) && (position < index + token.getTextLength() || token.is(TokenType.END)))
                return token;
        }
        return undefined;
    }

    getTokenWithSpaceAt(position: number) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for(const [token] of this.tokenPositions)
            if(this.tokenSpaceContains(token, position))
                return token;
        return undefined;
    }

    tokenSpaceContains(token: Token, position: number) {
        const index = this.getTokenTextPosition(token);
        return position >= index - this.spaces.getSpace(token).length && position <= index;     
    }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {

        const tokens = this.expression.nodes(n => n instanceof Token) as Token[];
        const index = tokens.indexOf(token);

        if(direction < 0 && index <= 0) return undefined;
        if(direction > 0 && index >= tokens.length - 1) return undefined;
        return tokens[index + direction];

    }

    getNodeFirstPosition(node: Node) {
        const firstToken = this.getFirstToken(node);
        return firstToken === undefined ? undefined : this.getTokenTextPosition(firstToken);
    }

    getNodeLastPosition(node: Node) {
        const lastToken = this.getLastToken(node);
        return lastToken === undefined ? undefined : this.getTokenLastPosition(lastToken);
    }

    getFirstToken(node: Node): Token | undefined {
        let next = node;
        do {
            if(next instanceof Token) return next;
            next = next.getChildren()[0];
        } while(next !== undefined);
        return undefined;
    }

    getLastToken(node: Node): Token | undefined {
        let next = node;
        do {
            if(next instanceof Token) return next;
            const children = next.getChildren();
            next = children[children.length - 1];
        } while(next !== undefined);
        return undefined;
    }

    isEmptyLine(position: number) {

        // Only offer suggestions on empty newlines.
        // An empty line is one for which every character before and after until the next new line is only a space or tab
        let current = position;
        let empty = true;
        let next: string | undefined;
        do {
            current--;
            next = this.code.at(current);
        } while(next !== undefined && (next === " " || next === "\t"));
        if(next !== "\n") empty = false;
        else {
            current = position;
            do {
                next = this.code.at(current);
                current++;
            } while(next !== undefined && (next === " " || next === "\t"));
            if(next !== "\n" && next !== undefined) empty = false;    
        }
        return empty;

    }

    getDescriptions(): Translations {
        return {
            eng: this.names.getTranslation("eng"),
            "😀": this.names.getTranslation("😀")
        };
    }

    getTranslation(lang: LanguageCode[]) { return this.names.getTranslation(lang); }

    getType(context: Context) { return this.getTypeUnlessCycle(context); }
    getTypeUnlessCycle(context: Context) { return this.expression.getTypeUnlessCycle(context); }

    computeType(context: Context): Type { return this.expression.getTypeUnlessCycle(context); }
    getDependencies(_: Context): (Expression | Stream)[] { return [ this.expression ]; }
    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }
    compile(): Step[] { return []; }
    evaluate(): Value | undefined { return undefined; }
    getStart() { return this; }
    getFinish() { return this; }
    getStartExplanations(): Translations { return WRITE_DOCS; }
    getFinishExplanations(): Translations { return WRITE_DOCS; }
    computeConflicts(): void | Conflict[] { return []; }
    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }

}