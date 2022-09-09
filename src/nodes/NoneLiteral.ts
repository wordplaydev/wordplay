import type Token from "./Token";
import Expression from "./Expression";
import NoneType from "./NoneType";
import type Type from "./Type";
import None from "../runtime/None";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type { ConflictContext } from "./Node";
import type Alias from "./Alias";
import type Unparsable from "./Unparsable";

export default class NoneLiteral extends Expression {
    readonly none: Token;
    readonly aliases: Alias[];

    constructor(error: Token, aliases: Alias[]) {
        super();

        this.none = error;
        this.aliases = aliases;
    }

    computeChildren() { return [ this.none, ...this.aliases ]; }

    computeType(context: ConflictContext): Type {
        // Always of type none, with the optional name.
        return new NoneType(this.aliases, this.none);
    }

    compile(context: ConflictContext):Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new None(this.aliases);
    }

}