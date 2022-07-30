import BooleanType from "./BooleanType";
import type Conflict from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
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

    getChildren() { return [ this.value ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getType(context: ConflictContext): Type {
        return new BooleanType();
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Bool(this.value.text === "⊤");
    }
}