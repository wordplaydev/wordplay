import BooleanType from "./BooleanType";
import type Conflict from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Node from "./Node";
import Bool from "../runtime/Bool";

export default class BooleanLiteral extends Expression {
    readonly value: Token;

    constructor(value: Token) {
        super();
        this.value = value;
    }

    getChildren() { return [ this.value ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new BooleanType();
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new Bool(this.value.text === "⊤");
    }
}