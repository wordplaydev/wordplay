import BooleanType from "./BooleanType";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Node from "./Node";
import { TRUE_SYMBOL } from "../parser/Tokenizer";

export default class BooleanLiteral extends Expression {
    readonly value: Token;

    constructor(value: Token) {
        super();
        this.value = value;
    }

    computeConflicts() {}
    computeChildren() { return [ this.value ]; }

    computeType(): Type {
        return new BooleanType();
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(): Value {
        return new Bool(this.value.text.toString() === TRUE_SYMBOL);
    }

    clone(original?: Node, replacement?: Node) { return new BooleanLiteral(this.value.cloneOrReplace([ Token ], original, replacement)) as this; }

}