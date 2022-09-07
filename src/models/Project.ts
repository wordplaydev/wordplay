import type Program from '../nodes/Program';
import type Token from '../nodes/Token';
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

    constructor(name: string, code: string | UnicodeString, updater: () => void) {
        
        this.name = name;
        this.code = typeof code === "string" ? new UnicodeString(code) : code;
        this.updater = updater;

        this.tokens = tokenize(this.code.getText());
        this.program = parseProgram(new Tokens(this.tokens));
        this.evaluator = new Evaluator(this.program, this.handleResult.bind(this) );
        this.conflicts = this.program.getAllConflicts(this.program, this.evaluator.getShares(), Native);
        this.steps = this.program.compile(this.evaluator.getContext());

        // Generate documents based on the code.
        this.docs = [
            new Document("code", this.code.getText(), true),
            new Document("program", this.program),
            new Document("conflicts", this.conflicts.join("\n")),
            new Document("steps", this.steps.map((s, index) => `${index}: ${s.toString()}`).join("\n")),
            new Document("output", this.evaluator.getResult()?.toString() ?? "no result"),
            new Document("render", this.wrapResult(this.evaluator.getResult()))
        ];

    }

    handleResult(result: Value | undefined) {

        if(this.docs) {
            this.docs[4] = new Document("output", result?.toString() ?? "no result");
            this.docs[5] = new Document("render", this.wrapResult(result));
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
        return new Project(this.name, this.code.withPreviousGraphemeReplaced(char, position) ?? this.code, this.updater);
    }

    withCharacterAt(char: string, position: number) {
        return new Project(this.name, this.code.withGraphemeAt(char, position) ?? this.code, this.updater);
    }

    withoutGraphemeAt(position: number) {
        return new Project(this.name, this.code.withoutGraphemeAt(position) ?? this.code, this.updater);
    }
    
}