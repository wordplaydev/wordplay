import BooleanType from "./BooleanType";
import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";

export default class Bool extends Expression {
    
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

}