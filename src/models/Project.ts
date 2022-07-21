import type Program from '../nodes/Program';
import type Token from '../nodes/Token';
import type Conflict from '../parser/Conflict';
import { parse, parseProgram, Tokens } from '../parser/Parser';
import { tokenize } from '../parser/Tokenizer';
import Evaluator from '../runtime/Evaluator';
import Shares from '../runtime/Shares';
import type Step from '../runtime/Step';
import Time from '../runtime/Time';
import type Value from '../runtime/Value';
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

        // Generate the intermediate values.
        // Create one global timer stream for programs to listen to.
        const time = new Time();

        this.tokens = tokenize(this.code);
        this.program = parseProgram(new Tokens(this.tokens));
        this.conflicts = this.program.getAllConflicts(this.program);
        this.steps = this.program.compile();
        this.evaluator = new Evaluator(this.program, new Shares({ time: time }), this.handleResult.bind(this) );
           
        // Generate documents based on the code.
        this.docs = [
            new Document("code", this.code, true),
            new Document("tokens", this.tokens.map(t => t.toString()).join("\n")),
            new Document("tree", this.program.toString()),
            new Document("conflicts", this.conflicts.join("\n")),
            new Document("steps", this.steps.map(s => s.toString()).join("\n")),
            new Document("output", this.evaluator.getResult()?.toString() ?? "no result")
        ];

    }

    handleResult(result: Value | undefined) {

        if(this.docs) {
            this.docs[5] = new Document("output", result?.toString() ?? "no result");
            this.updater.call(undefined);
        }

    }

    cleanup() {
        this.evaluator.stop();
    }

}