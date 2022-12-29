import Node from "../nodes/Node";
import Token from "../nodes/Token";
import Program from "../nodes/Program";
import type Conflict from "../conflicts/Conflict";
import { parseProgram, Tokens } from "../parser/Parser";
import { DELIMITERS, REVERSE_DELIMITERS, tokenize } from "../parser/Tokenizer";
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
import type TypeSet from "../nodes/TypeSet";
import type Step from "../runtime/Step";
import type Stream from "../runtime/Stream";
import { WRITE_DOCS } from "../nodes/Translations";
import type { SharedDefinition } from "../nodes/Borrow";
import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import type Spaces from "../parser/Spaces";
import None from "../runtime/None";
import type SetOpenToken from "../nodes/SetOpenToken";

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source extends Expression {

    readonly code: UnicodeString;

    /** The names of this source */
    readonly names: Names;

    /** The program this source can evaluate. */
    readonly expression: Program;

    /** The tokens of this program */
    readonly tokens: Token[];

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

        this.names = names instanceof Names ? names : Names.make([ names ]);

        if(typeof code === "string" || code instanceof UnicodeString) {
            // Generate the AST from the provided code.
            const tokens = tokenize(code instanceof UnicodeString ? code.getText() : code);
            this.tokens = tokens.getTokens();
            this.expression = parseProgram(new Tokens(this.tokens, tokens.getSpaces()));            
            this.spaces = tokens.getSpaces().withRoot(this);
        }
        else {
            // Save the AST provided
            const [ program, spaces ] = code;
            this.expression = program;
            this.tokens = program.leaves() as Token[];
            this.spaces = spaces.withRoot(this);
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
            { name: "expression", types: [ Program ] },
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

    getMatchedDelimiter(delimiter: Token): Token | undefined {

        const text = delimiter.getText();
        const match = text in DELIMITERS ? DELIMITERS[text] : text in REVERSE_DELIMITERS ? REVERSE_DELIMITERS[text] : undefined;
        if(match === undefined) return;
        return this.get(delimiter)?.getParent()?.getChildren().find((node): node is SetOpenToken => node instanceof Token && node.getText() === match);

    }

    withPreviousGraphemeReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : this.reparse(newCode.toString());;
    }

    withGraphemesAt(char: string, position: number) {
        const newCode = this.code.withGraphemesAt(char, position);
        return newCode == undefined ? undefined : this.reparse(newCode.toString());
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : this.reparse(newCode.toString());;
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : this.reparse(newCode.toString());;
    }

    /** 
     * Given a new program, construct a new source that reuses as many existing Nodes as possible. 
     * This isn't really optimized for parsing speed as much as it is reuse, since responsiveness is
     * dominated by the UI, not by parsing, since programs are small.
     * */
    reparse(newCode: string): Source {

        // Tokenize the new text
        const tokenList = tokenize(newCode);
        const newTokens = tokenList.getTokens();
        const spaces = tokenList.getSpaces();

        // Make a mutable list of the old tokens
        const oldTokens = [ ... this.tokens ];
        let added: Token[] = [];
        let removed: Token[] = [];

        // Scan through the new tokens, reusing as many tokens as possible.
        for(let i = 0; i < newTokens.length; i++) {
            const newToken = newTokens[i];
            // Search the existing tokens for a match, and if we find one, discard everything prior
            const index = oldTokens.findIndex(old => old.getText() === newToken.getText());
            if(index >= 0) {
                const oldToken = oldTokens[index];
                // Replace the new token with the old token
                newTokens[i] = oldToken;
                // Point the new spaces to the old token
                spaces.replace(newToken, oldToken);
                // Remember what we're about to remove
                for(let j = 0; j < index; j++) removed.push(oldTokens[j]);
                // Rid of all the tokens prior to the reused one, since they're obsolete.
                oldTokens.splice(0, index + 1);
            }
            else {
                // Add this to the added list.
                added.push(newToken);
            }
        }

        // If only space changed, return a new source with the old program for maximum zippiness.
        // NOTE: Parsing is space dependent, so we can't really do this.
        // if(added.length === 0 && removed.length === 0)
        //     return new Source(this.names, [ this.expression, spaces ]);
        // If only one token was added and removed and they're the same type, replace the token in the existing program
        if(added.length === 1 && removed.length === 1 && added[0].getTypes().some(type => removed[0].is(type)))
            return new Source(this.names, [ this.expression.clone(removed[0], added[0]), spaces ]);
        
        // Try to reuse as many Nodes as possible by parsing the program with revised tokens, then identifying 
        // subtrees that are equivalent in the old and new tree, then recycling them in the new tree. Equivalence is defined as any node 
        // that has an referentially identical sequence of Tokens and is of the same type.
        let newProgram = parseProgram(new Tokens(newTokens, spaces));

        // Make an empty list of replacements.
        let replacements: [ Node, Node ][] = [];

        // Create a set of all of the old program's nodes, except the program itself.
        const unmatchedOldNodes = new Set(this.expression.traverseTopDown());
        unmatchedOldNodes.delete(this.expression);
        // Create a list of new nodes to iterate through to find matches. Skip the program, which always changes.
        const newNodes = newProgram.traverseTopDown();
        newNodes.shift();
        // Remember what we've matched so we don't redundantly match subtrees.
        const matched = new Set<Node>();
        // Cache old node token ID sequences for speed.
        const oldNodeTokenIDSequences = new Map<Node, string>();

        // Iterate through all of the new nodes in the program
        for(const newNode of newNodes) {
            // If we've already matched this node, skip it. Also skip the program; it always changes and is large.
            if(matched.has(newNode)) continue;
            // Get the (likely cached) tokens in the new node
            const newTokens = newNode.hash();
            // Iterate through all of the unmatched old nodes to see if there's a match.
            let match = undefined;
            for(const oldNode of unmatchedOldNodes) {
                if(newNode.constructor === oldNode.constructor) {
                    const oldTokens = oldNodeTokenIDSequences.get(oldNode) ?? oldNode.hash();
                    if(oldTokens === newTokens) {
                        match = oldNode;
                        break;
                    }
                }
            }
            if(match) {
                // Remove all nodes in the match from the search.
                for(const node of match.traverseTopDown()) unmatchedOldNodes.delete(node);
                // Mark all nodes in the matched new node as matched, so we don't try to find matches for them.
                for(const node of newNode.traverseTopDown()) matched.add(node);
                // Remember the replacement.
                replacements.push([ match, newNode ]);
            }
        }

        // If we found old subtrees to preserve, replace them in the new tree.
        while(replacements.length > 0) {
            const [ oldTree, newTree ] = replacements.shift()!;
            newProgram = newProgram.clone(newTree, oldTree);
        }

        // Otherwise, reparse the program with the reused tokens and return a new source file
        return new Source(this.names, [ newProgram, spaces ]);

    }

    withCode(code: string) {
        return new Source(this.names, new UnicodeString(code));
    }

    withProgram(program: Program, spaces: Spaces) {
        return new Source(this.names, [ program, spaces ]);
    }

    clone() {
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

    /** Given a node in this source, return the line the node is one */
    getLine(position: number | Node): number | undefined {
        if(position instanceof Node) {
            const leaf = position.getFirstLeaf();
            if(leaf === undefined) return undefined;

            // Iterate through all of the tokens in order
            let count = 0;
            for(const token of this.leaves()) {
                count += this.spaces.getSpace(token as Token).split("\n").length - 1;
                if(leaf === token)
                    return count;
            }
            return undefined;
        }
        else {
            return this.code.substring(0, position).toString().split("\n").length - 1;
        }
    }

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

    getTokenBefore(token: Token) { return this.getNextToken(token, -1); }
    getTokenafter(token: Token) { return this.getNextToken(token, 1); }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {

        const tokens = this.expression.nodes(n => n instanceof Token) as Token[];
        const index = tokens.indexOf(token);

        if(direction < 0 && index <= 0) return undefined;
        if(direction > 0 && index >= tokens.length - 1) return undefined;
        return tokens[index + direction];

    }

    getTokenBeforeNode(node: Node): Token | undefined {
        let lastToken = undefined;
        for(const next of this.nodes()) {
            if(next instanceof Token)
                lastToken = next;
            if(next === node)
                return lastToken;
        }
        return undefined;
    }

    getTokenAfterNode(node: Node): Token | undefined {
        let found = false;
        for(const next of this.nodes()) {
            if(found && next instanceof Token)
                return next;
            if(next === node)
                found = true;
        }
        return undefined;
    }

    getNodeFirstPosition(node: Node) {
        const firstToken = this.getFirstToken(node);
        if(firstToken) return this.getTokenTextPosition(firstToken);
        const tokenBefore = this.getTokenBeforeNode(node);
        return tokenBefore === undefined ? undefined : this.getTokenLastPosition(tokenBefore);
    }

    getNodeLastPosition(node: Node) {
        const lastToken = this.getLastToken(node);
        if(lastToken) return this.getTokenLastPosition(lastToken);
        const tokenAfter = this.getTokenAfterNode(node);
        return tokenAfter === undefined ? undefined : this.getTokenTextPosition(tokenAfter);
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

    toWordplay(spaces?: Spaces) { return super.toWordplay(spaces ?? this.spaces); }

    getTranslation(lang: LanguageCode[]) { return this.names.getTranslation(lang); }

    computeType(context: Context): Type { return this.expression.getType(context); }
    getDependencies(_: Context): (Expression | Stream)[] { return [ this.expression ]; }
    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }
    compile(): Step[] { return []; }
    evaluate(): Value { return new None(this); }
    getStart() { return this; }
    getFinish() { return this; }
    getStartExplanations(): Translations { return WRITE_DOCS; }
    getFinishExplanations(): Translations { return WRITE_DOCS; }
    computeConflicts(): void | Conflict[] { return []; }

    
    

}