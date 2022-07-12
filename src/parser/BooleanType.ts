import type Node from "./Node";
import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class BooleanType extends Type {

    readonly type?: Token;

    constructor(type?: Token) {
        super();

        this.type = type;
    }

    getChildren() {
        return this.type === undefined ? [] : [ this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type) { return type instanceof BooleanType; }
    
}