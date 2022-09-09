import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "../nodes/Type";
import type Step from "src/runtime/Step";
import Finish from "../runtime/Finish";
import Expression from "../nodes/Expression";
import type Conflict from "../conflicts/Conflict";
import type { ConflictContext } from "../nodes/Node";
import { parseType, tokens } from "../parser/Parser";
import Unparsable from "../nodes/Unparsable";
import UnknownType from "../nodes/UnknownType";
import type Evaluation from "../runtime/Evaluation";

export default class NativeExpression extends Expression {
    
    readonly type: Type;
    readonly evaluator: (evaluator: Evaluation) => Value;

    constructor(type: Type | string, evaluator: (evaluator: Evaluation) => Value) {
        super();

        if(typeof type === "string") {
            let possibleType = parseType(tokens(type));
            if(possibleType instanceof Unparsable)
                possibleType = new UnknownType(this);
            this.type = possibleType;
        }
        else this.type = type;
        
        this.evaluator = evaluator;

    }

    computeChildren() { return [] };
    getType(context: ConflictContext): Type { return this.type; }
    compile(context: ConflictContext): Step[] { return [ new Finish(this) ]; }
    evaluate(evaluator: Evaluator): Value | undefined {
        const evaluation = evaluator.getEvaluationContext();
        return evaluation === undefined ? undefined : this.evaluator.call(undefined, evaluation);
    }

}