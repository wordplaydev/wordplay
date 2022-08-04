import type Token from "./Token";
import Expression from "./Expression";
import type Conflict from "../conflicts/Conflict";
import NoneType from "./NoneType";
import type Type from "./Type";
import None from "../runtime/None";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type { ConflictContext } from "./Node";
import type Alias from "./Alias";

export default class NoneLiteral extends Expression {
    readonly none: Token;
    readonly aliases: Alias[];

    constructor(error: Token, aliases: Alias[]) {
        super();

        this.none = error;
        this.aliases = aliases;
    }

    getChildren() { return [ this.none, ...this.aliases ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    getType(context: ConflictContext): Type {
        // Always of type none, with the optional name.
        return new NoneType(this.aliases, this.none);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new None(this.aliases);
    }

}