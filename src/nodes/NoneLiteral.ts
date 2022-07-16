import type Token from "./Token";
import Expression from "./Expression";
import type Program from "./Program";
import type Conflict from "../parser/Conflict";
import NoneType from "./NoneType";
import type Type from "./Type";
import type Node from "./Node";
import None from "../runtime/None";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";

export default class NoneLiteral extends Expression {
    readonly none: Token;
    readonly name?: Token;

    constructor(error: Token, name?: Token) {
        super();

        this.none = error;
        this.name = name;
    }

    getChildren() { return this.name ? [ this.none, this.name ] : [ this.none ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // Always of type none, with the optional name.
        return new NoneType(this.none, this.name);
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new None(this.name ? this.name.text : undefined);
    }    

}