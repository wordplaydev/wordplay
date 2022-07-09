import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class UnionType extends Type {

    readonly left: Type;
    readonly or: Token;
    readonly right: Type;

    constructor(left: Type, or: Token, right: Type) {
        super();

        this.left = left;
        this.or = or;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.or, this.right ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}