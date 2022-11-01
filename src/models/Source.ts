import type Node from "../nodes/Node";
import Token from "../nodes/Token";
import Program from "../nodes/Program";
import Native from "../native/NativeBindings";
import type Conflict from "../conflicts/Conflict";
import { parseProgram, Tokens } from "../parser/Parser";
import { tokenize } from "../parser/Tokenizer";
import Evaluator from "../runtime/Evaluator";
import UnicodeString from "./UnicodeString";
import type Value from "../runtime/Value";
import StructureType from "../nodes/StructureType";
import type Structure from "../runtime/Structure";
import { createStructure } from "../runtime/Structure";
import Verse from "../native/Verse";
import Group from "../native/Group";
import Phrase from "../native/Phrase";
import List from "../runtime/List";
import Text from "../runtime/Text";
import Measurement from "../runtime/Measurement";
import type Project from "./Project";
import Context from "../nodes/Context";
import TokenType from "../nodes/TokenType";
import type StructureDefinition from "../nodes/StructureDefinition";

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source {

    readonly name: string;
    readonly code: UnicodeString;

    // Derived fields
    readonly program: Program;
    conflicts: Conflict[];
    readonly evaluator: Evaluator;

    /** An index of conflicts for each node. */
    readonly _primaryNodeConflicts: Map<Node, Conflict[]> = new Map();
    readonly _secondaryNodeConflicts: Map<Node, Conflict[]> = new Map();

    /** The Project sets this once it's added. */
    _project: Project | undefined;
    
    /** Functions to call when a source's evaluator has an update. */
    readonly observers: Set<() => void> = new Set();

    /** An index of token positions in the source file. */
    readonly indicies: Map<Token, number> = new Map();

    constructor(name: string, code: string | UnicodeString | Program, observers?: Set<() => void>) {

        this.name = name;

        if(code instanceof Program) {
            // Save the AST
            this.program = code;
        }
        else {
            // Generate the AST.
            this.program = parseProgram(new Tokens(tokenize(code instanceof UnicodeString ? code.getText() : code)));
        }

        // Generate the text from the AST, which is responsible for pretty printing.
        this.code = new UnicodeString(this.program.toWordplay());

        // Create an index of the program's tokens.
        let index = 0;
        for(const token of this.program.nodes(n => n instanceof Token) as Token[]) {
            index += token.space.length;
            this.indicies.set(token, index);
            index += token.text.getLength();
        }

        // Create an evaluator, listen to it's changes, and set up any given observers.
        this.evaluator = new Evaluator(this);
        this.evaluator.observe(this);
        if(observers !== undefined) this.observers = observers;

        // Start a cache of conflicts in the program.
        this.conflicts = [];

    }

    getProject() { return this._project; }
    setProject(project: Project) {
        
        this._project = project; 

        // Now that we have a project, we can get conflicts (to enable cross-Source borrows).

        this.conflicts = this.program.getAllConflicts(this.getContext());

        // Build the conflict index by going through each conflict, asking for the conflicting nodes
        // and adding to the conflict to each node's list of conflicts.
        this.conflicts.forEach(conflict => {
            const complicitNodes = conflict.getConflictingNodes();
            complicitNodes.primary.forEach(node => {
                let nodeConflicts = this._primaryNodeConflicts.get(node) ?? [];
                this._primaryNodeConflicts.set(node, [ ... nodeConflicts, conflict ]);
            });
            complicitNodes.secondary?.forEach(node => {
                let nodeConflicts = this._primaryNodeConflicts.get(node) ?? [];
                this._secondaryNodeConflicts.set(node, [ ... nodeConflicts, conflict ]);
            });
        });
    
    }

    getContext() {
        return new Context(this, this.program, this.evaluator.getShares(), Native);
    }

    getName() { return this.name; }
    getCode() { return this.code; }

    getEvaluator() { return this.evaluator; }

    observe(observer: () => void) { 
        this.observers.add(observer);
    }

    ignore(observer: () => void) { 
        this.observers.delete(observer);
    }

    stepped() {
        this.observers.forEach(observer => observer());
    }

    ended() {
        this.observers.forEach(observer => observer());
    }

    getVerse() {         
        const value = this.evaluator.getLatestResult();
        return value === undefined ? undefined : this.valueToVerse(value);
    }

    phrase(text: string | Text, size: number=12, font: string="Noto Sans", ): Structure {
        return createStructure(this.evaluator, Phrase as StructureDefinition, {
            size: new Measurement(this.program, size),
            font: new Text(this.program, font),
            text: text instanceof Text ? text : new Text(this.program, text)
        })
    }

    group(...phrases: Structure[]) {
        return createStructure(this.evaluator, Group as StructureDefinition, {
            phrases: new List(this.program, phrases)
        })
    }

    verse(group: Structure) {
        return createStructure(this.evaluator, Verse as StructureDefinition, { group: group });
    }

    valueToVerse(value: Value | undefined): Structure {

        // If the content is a Verse, just show it as is.
        if(value === undefined)
            return this.verse(this.group(this.phrase("No value", 20)))

        const contentType = value.getType(this.evaluator.getContext());
        if(contentType instanceof StructureType && contentType.structure === Verse)
            return value as Structure;
        else if(contentType instanceof StructureType && contentType.structure === Group)
            return this.verse(value as Structure);
        else if(contentType instanceof StructureType && contentType.structure === Phrase)
            return this.verse(this.group( value as Structure ));
        else if(value instanceof Text || typeof value === "string")
            return this.verse(this.group(this.phrase(value, 20)));
        else
            return this.verse(this.group(this.phrase(value.toString(), 20)));

    }

    cleanup() {
        this.evaluator.stop();
    }
    
    withPreviousGraphemeReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : new Source(this.name, newCode, this.observers);
    }

    withGraphemesAt(char: string, position: number) {
        const newCode = this.code.withGraphemesAt(char, position);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.observers);
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.observers);
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.observers);
    }

    withCode(code: string) {
        return new Source(this.name, new UnicodeString(code), this.observers);
    }

    withProgram(program: Program) {
        return new Source(this.name, program, this.observers);
    }

    clone() {
        return new Source(this.name, this.code, this.observers);
    }

    getTokenTextIndex(token: Token) {
        const index = this.indicies.get(token);
        if(index === undefined) 
            throw Error("No index for the given token; it must not be in this source, which means there's a defect somewhere.");
        return index;
    }

    getTokenSpaceIndex(token: Token) { return this.getTokenTextIndex(token) - token.space.length; }
    getTokenLastIndex(token: Token) { return this.getTokenTextIndex(token) + token.getTextLength(); }

    getTokenAt(position: number, includingWhitespace: boolean = true) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for(const [token, index] of this.indicies) {
            if(position >= index - (includingWhitespace ? token.space.length : 0) && (position < index + token.getTextLength() || token.is(TokenType.END)))
                return token;
        }
        return undefined;
    }

    getTokenWithSpaceAt(position: number) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for(const [token] of this.indicies)
            if(this.tokenSpaceContains(token, position))
                return token;
        return undefined;
    }

    tokenSpaceContains(token: Token, position: number) {
        const index = this.getTokenTextIndex(token);
        return position >= index - token.space.length && position <= index;     
    }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {

        const tokens = this.program.nodes(n => n instanceof Token) as Token[];
        const index = tokens.indexOf(token);

        if(direction < 0 && index <= 0) return undefined;
        if(direction > 0 && index >= tokens.length - 1) return undefined;
        return tokens[index + direction];

    }

    getNodeFirstIndex(node: Node) {
        const firstToken = this.getFirstToken(node);
        return firstToken === undefined ? undefined : this.getTokenTextIndex(firstToken);
    }

    getNodeLastIndex(node: Node) {
        const lastToken = this.getLastToken(node);
        return lastToken === undefined ? undefined : this.getTokenLastIndex(lastToken);
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

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getPrimaryConflictsInvolvingNode(node: Node) {
        return this._primaryNodeConflicts.get(node);
    }
    getSecondaryConflictsInvolvingNode(node: Node) {
        return this._secondaryNodeConflicts.get(node);
    }

}