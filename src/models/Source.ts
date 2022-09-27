import type Node from "../nodes/Node";
import Token from "../nodes/Token";
import type Program from "../nodes/Program";
import Native from "../native/NativeBindings";
import type Conflict from "../conflicts/Conflict";
import { parseProgram, Tokens } from "../parser/Parser";
import { tokenize } from "../parser/Tokenizer";
import Evaluator, { type EvaluationMode } from "../runtime/Evaluator";
import UnicodeString from "./UnicodeString";
import type Value from "../runtime/Value";
import StructureType from "../nodes/StructureType";
import type Structure from "../runtime/Structure";
import { createStructure } from "../runtime/Structure";
import Verse from "../native/Verse";
import Group from "../native/Group";
import Phrase from "../native/Phrase";
import TextType from "../nodes/TextType";
import List from "../runtime/List";
import Text from "../runtime/Text";
import Measurement from "../runtime/Measurement";

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source {

    readonly name: string;
    readonly code: UnicodeString;
    readonly mode: EvaluationMode;

    // Derived fields
    readonly program: Program;
    readonly conflicts: Conflict[];
    readonly evaluator: Evaluator;

    /** An index of conflicts for each node. */
    readonly _primaryNodeConflicts: Map<Node, Conflict[]> = new Map();
    readonly _secondaryNodeConflicts: Map<Node, Conflict[]> = new Map();
    
    readonly observers: Set<() => void> = new Set();

    constructor(name: string, code: string | UnicodeString, mode: EvaluationMode="play", observers?: Set<() => void>) {

        this.name = name;
        this.code = typeof code === "string" ? new UnicodeString(code) : code;
        this.mode = mode;

        // Compute derived fields.
        this.program = parseProgram(new Tokens(tokenize(this.code.getText())));
        this.evaluator = new Evaluator(this.program, mode);
        this.evaluator.observe(this);
        this.conflicts = this.program.getAllConflicts(this.program, this.evaluator.getShares(), Native);

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

        if(observers !== undefined) this.observers = observers;

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

    evaluated() {
        this.observers.forEach(observer => observer());
    }

    getVerse() {         
        return this.valueToVerse(this.evaluator.getLatestResult() ?? new Text(this.evaluator.currentStep()?.getExplanations(this.evaluator)["eng"] ?? "No step"));
    }

    valueToVerse(value: Value | undefined): Structure {

        // If the content is a Verse, just show it as is.
        if(value === undefined)
            return createStructure(this.evaluator, Verse, 
                {
                    group: createStructure(this.evaluator, Group, {
                        phrases: new List([createStructure(this.evaluator, Phrase, {
                            size: new Measurement(20),
                            font: new Text("Noto Sans"),
                            text: new Text("No value")
                        })])
                    })
                }
            );
        else {
            const contentType = value.getType();
            if(contentType instanceof StructureType && contentType.definition === Verse)
                return value as Structure;
            else if(contentType instanceof StructureType && contentType.definition === Group) {
                return createStructure(this.evaluator, Verse, { group: value });
            }
            else if(contentType instanceof StructureType && contentType.definition === Phrase) {
                return createStructure(this.evaluator, Verse, { group: createStructure(this.evaluator, Group, { phrases: new List([value]) }) });
            }
            else if(contentType instanceof TextType) {
                return createStructure(this.evaluator, Verse, 
                    {
                        group: createStructure(this.evaluator, Group, {
                            phrases: new List([createStructure(this.evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: value
                            })])
                        })
                    }
                );
            }
            // Otherise, just wrap in a sentence with the content's toString() text.
            else {
                return createStructure(this.evaluator, Verse, 
                    {
                        group: createStructure(this.evaluator, Group, {
                            phrases: new List([createStructure(this.evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: new Text(value.toString())
                            })])
                        })
                    }
                );
            }
        }

    }

    cleanup() {
        this.evaluator.stop();
    }
    
    withPreviousCharacterReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : new Source(this.name, newCode, this.mode, this.observers);
    }

    withCharacterAt(char: string, position: number) {
        const newCode = this.code.withGraphemeAt(char, position);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.mode, this.observers);
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.mode, this.observers);
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : new Source(this.name, newCode, this.mode, this.observers);
    }

    withMode(mode: EvaluationMode) {
        return new Source(this.name, this.code, mode, this.observers);
    }

    withCode(code: string) {
        return new Source(this.name, new UnicodeString(code), this.mode, this.observers);
    }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {

        const tokens = this.program.nodes(n => n instanceof Token) as Token[];
        const index = tokens.indexOf(token);
        return (direction < 0 && index <= 0) ? undefined : 
            (direction > 0 && index >= tokens.length - 1) ? undefined :
            tokens[index + direction];

    }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getPrimaryConflictsInvolvingNode(node: Node) {
        return this._primaryNodeConflicts.get(node);
    }
    getSecondaryConflictsInvolvingNode(node: Node) {
        return this._secondaryNodeConflicts.get(node);
    }

}