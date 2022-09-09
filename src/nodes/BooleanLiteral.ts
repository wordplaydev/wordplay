import BooleanType from "./BooleanType";
import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type { ConflictContext } from "./Node";

export default class BooleanLiteral extends Expression {
    readonly value: Token;

    constructor(value: Token) {
        super();
        this.value = value;
    }

    computeChildren() { return [ this.value ]; }

    computeType(context: ConflictContext): Type {
        return new BooleanType();
    }

    compile(context: ConflictContext):Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Bool(this.value.text.toString() === "⊤");
    }
}