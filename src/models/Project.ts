import type Program from '../nodes/Program';
import type Token from '../nodes/Token';
import type Conflict from '../parser/Conflict';
import { parseProgram, Tokens } from '../parser/Parser';
import { tokenize } from '../parser/Tokenizer';
import Evaluator from '../runtime/Evaluator';
import Shares from '../runtime/Shares';
import type Step from '../runtime/Step';
import Time from '../runtime/Time';
import Value from '../runtime/Value';
import Text from '../runtime/Text';
import Document from './Document';

/** An immutable representation of a project with a name and some documents */
export default class Project {
    readonly name: string;
    readonly code: string;
    readonly tokens: Token[];
    readonly program: Program;
    readonly conflicts: Conflict[];
    readonly evaluator: Evaluator;
    readonly steps: Step[];
    readonly docs: Document[];
    readonly updater: ()=> void;

    constructor(name: string, code: string, updater: () => void) {
        
        this.name = name;
        this.code = code;
        this.updater = updater;

        const shares = new Shares();

        this.tokens = tokenize(this.code);
        this.program = parseProgram(new Tokens(this.tokens));
        this.conflicts = this.program.getAllConflicts(this.program, shares);
        this.steps = this.program.compile();

        this.evaluator = new Evaluator(this.program, shares, this.handleResult.bind(this) );

        // Generate documents based on the code.
        this.docs = [
            new Document("code", this.code, true),
            new Document("tokens", this.tokens.map(t => t.toString()).join("\n")),
            new Document("tree", this.program.toString()),
            new Document("conflicts", this.conflicts.join("\n")),
            new Document("steps", this.steps.map(s => s.toString()).join("\n")),
            new Document("output", this.evaluator.getResult()?.toString() ?? "no result"),
            new Document("render", this.wrapResult(this.evaluator.getResult()))
        ];

    }

    handleResult(result: Value | undefined) {

        if(this.docs) {
            this.docs[5] = new Document("output", result?.toString() ?? "no result");
            this.docs[6] = new Document("render", this.wrapResult(result));
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

}