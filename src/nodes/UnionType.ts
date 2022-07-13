import type Conflict from "../parser/Conflict";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class UnionType extends Type {

    readonly left: Type;
    readonly or: Token;
    readonly right: Type | Unparsable;

    constructor(left: Type, or: Token, right: Type | Unparsable) {
        super();

        this.left = left;
        this.or = or;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.or, this.right ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return this.left.isCompatible(program, type) || (this.right instanceof Type && this.right.isCompatible(program, type));

    }
}