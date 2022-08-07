import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import Finish from "../runtime/Finish";
import Expression from "./Expression";
import type Conflict from "../conflicts/Conflict";
import type { ConflictContext } from "./Node";

export default class NativeExpression extends Expression {
    
    readonly type: Type;
    readonly evaluator: (evaluator: Evaluator) => Value;

    constructor(type: Type, evaluator: (evaluator: Evaluator) => Value) {
        super();

        this.type = type;
        this.evaluator = evaluator;

    }

    getChildren() { return [] };
    getType(context: ConflictContext): Type { return this.type; }
    compile(context: ConflictContext): Step[] { return [ new Finish(this) ]; }
    getConflicts(context: ConflictContext): Conflict[] { return []; }
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.evaluator.call(undefined, evaluator);
    }

}