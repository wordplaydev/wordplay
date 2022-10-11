import BooleanType from "./BooleanType";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Node from "./Node";
import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import TokenType from "./TokenType";

export default class BooleanLiteral extends Expression {
    readonly value: Token;

    constructor(value: Token | boolean) {
        super();
        this.value = value === true || value === false ? new Token(value ? TRUE_SYMBOL : FALSE_SYMBOL, [ TokenType.BOOLEAN ]) : value;
    }

    computeConflicts() {}
    computeChildren() { return [ this.value ]; }

    computeType(): Type {
        return new BooleanType();
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Evaluate to a bool"
        }
    }

    evaluate(): Value {
        return new Bool(this.bool());
    }

    bool(): boolean {
        return this.value.text.toString() === TRUE_SYMBOL;
    }

    clone(original?: Node, replacement?: Node) { return new BooleanLiteral(this.value.cloneOrReplace([ Token ], original, replacement)) as this; }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions() {
        return {
            eng: `${this.bool() ? "True" : "False"}`
        }
    }

}