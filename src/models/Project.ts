import type Program from '../nodes/Program';
import Token from '../nodes/Token';
import type Node from '../nodes/Node';
import type Conflict from '../conflicts/Conflict';
import { parseProgram, Tokens } from '../parser/Parser';
import { tokenize } from '../parser/Tokenizer';
import Evaluator from '../runtime/Evaluator';
import type Step from '../runtime/Step';
import Value from '../runtime/Value';
import Text from '../runtime/Text';
import Document from './Document';
import Native from '../native/NativeBindings';
import UnicodeString from './UnicodeString';

/** An immutable representation of a project with a name and some documents */
export default class Project {
    readonly name: string;
    readonly code: UnicodeString;
    readonly tokens: Token[];
    readonly program: Program;
    readonly conflicts: Conflict[];
    readonly evaluator: Evaluator;
    readonly steps: Step[];
    readonly docs: Document[];
    readonly updater: ()=> void;

    /** An index of conflicts for each node. */
    readonly _nodeConflicts: Map<Node, Conflict[]> = new Map();

    constructor(name: string, code: string | UnicodeString, updater: () => void) {
        
        this.name = name;
        this.code = typeof code === "string" ? new UnicodeString(code) : code;
        this.updater = updater;

        this.tokens = tokenize(this.code.getText());
        this.program = parseProgram(new Tokens(this.tokens));
        this.evaluator = new Evaluator(this.program, this.handleResult.bind(this) );
        this.conflicts = this.program.getAllConflicts(this.program, this.evaluator.getShares(), Native);
        this.steps = this.program.compile(this.evaluator.getContext());

        // Build the conflict index by going through each conflict, asking for the conflicting nodes
        // and adding to the conflict to each node's list of conflicts.
        this.conflicts.forEach(conflict => {
            const complicitNodes = conflict.getConflictingNodes();
            complicitNodes.forEach(node => {
                let nodeConflicts = this._nodeConflicts.get(node) ?? [];
                this._nodeConflicts.set(node, [ ... nodeConflicts, conflict ]);
            });
        })

        // Generate documents based on the code.
        this.docs = [
            // new Document("code", this.code.getText(), true),
            new Document("program", this.program),
            // new Document("steps", this.steps.map((s, index) => `${index}: ${s.toString()}`).join("\n")),
            // new Document("output", this.evaluator.getResult()?.toString() ?? "no result"),
            new Document("render", this.wrapResult(this.evaluator.getResult()))
        ];

    }

    handleResult(result: Value | undefined) {

        if(this.docs) {
            // this.docs[1] = new Document("output", result?.toString() ?? "no result");
            this.docs[1] = new Document("render", this.wrapResult(result));
            this.updater.call(undefined);
        }

    }

    wrapResult(value: Value | undefined): Value {

        if(value instanceof Value) return value;
        else return new Text("No result");
        
    }

    cleanup() {
        this.evaluator.stop();
    }

    getEvaluator() { return this.evaluator; }

    withCode(code: string) {
        return new Project(this.name, new UnicodeString(code), this.updater);
    }

    withPreviousCharacterReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : new Project(this.name, newCode, this.updater);
    }

    withCharacterAt(char: string, position: number) {
        const newCode = this.code.withGraphemeAt(char, position);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.updater);
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.updater);
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.updater);
    }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {

        const tokens = this.program.nodes(n => n instanceof Token) as Token[];
        const index = tokens.indexOf(token);
        return (direction < 0 && index <= 0) ? undefined : 
            (direction > 0 && index >= tokens.length - 1) ? undefined :
            tokens[index + direction];

    }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getConflictsInvolvingNode(node: Node) {
        return this._nodeConflicts.get(node);
    }

}