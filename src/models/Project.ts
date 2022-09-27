import type Node from '../nodes/Node';
import Token from '../nodes/Token';
import type Program from '../nodes/Program';
import type Conflict from '../conflicts/Conflict';
import { parseProgram, Tokens } from '../parser/Parser';
import { tokenize } from '../parser/Tokenizer';
import Evaluator, { type EvaluationMode } from '../runtime/Evaluator';
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
    readonly mode: EvaluationMode;
    readonly updater: ()=> void;

    readonly tokens: Token[];
    readonly program: Program;
    readonly conflicts: Conflict[];
    readonly evaluator: Evaluator;
    readonly steps: Step[];
    readonly docs: Document[];

    /** An index of conflicts for each node. */
    readonly _primaryNodeConflicts: Map<Node, Conflict[]> = new Map();
    readonly _secondaryNodeConflicts: Map<Node, Conflict[]> = new Map();

    constructor(name: string, code: string | UnicodeString, mode: EvaluationMode, updater: () => void) {
        
        this.name = name;
        this.code = typeof code === "string" ? new UnicodeString(code) : code;
        this.mode = mode;
        this.updater = updater;

        this.tokens = tokenize(this.code.getText());
        this.program = parseProgram(new Tokens(this.tokens));
        this.evaluator = new Evaluator(
            this.program, 
            mode,
            {
                stepped: this.handleStep.bind(this),
                evaluated: this.handleEvaluation.bind(this)
            }
        );
        this.conflicts = this.program.getAllConflicts(this.program, this.evaluator.getShares(), Native);
        this.steps = this.program.compile(this.evaluator.getContext());

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

        // Generate documents based on the code.
        this.docs = [
            new Document("program", this.program),
            new Document("output", this.wrapResult(this.evaluator.getLatestResult()))
        ];

    }

    handleStep(step: Step) {
        this.updater.call(undefined);
    }

    handleEvaluation(result: Value | undefined) {

        if(this.docs) {
            this.docs[1] = new Document("output", this.wrapResult(result));
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

    withMode(mode: EvaluationMode) {
        return new Project(this.name, this.code, mode, this.updater);
    }

    withCode(code: string) {
        return new Project(this.name, new UnicodeString(code), this.mode, this.updater);
    }

    withPreviousCharacterReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined ? undefined : new Project(this.name, newCode, this.mode, this.updater);
    }

    withCharacterAt(char: string, position: number) {
        const newCode = this.code.withGraphemeAt(char, position);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.mode, this.updater);
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.mode, this.updater);
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined ? undefined : new Project(this.name, newCode, this.mode, this.updater);
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