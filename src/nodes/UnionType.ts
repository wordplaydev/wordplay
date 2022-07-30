import type Conflict from "../parser/Conflict";
import type { ConflictContext } from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class UnionType extends Type {

    readonly left: Type;
    readonly or?: Token;
    readonly right: Type | Unparsable;

    constructor(left: Type, right: Type | Unparsable, or?: Token) {
        super();

        this.left = left;
        this.or = or;
        this.right = right;
    }

    getChildren() {
        return this.or === undefined ? [ this.left, this.right ] : [ this.left, this.or, this.right ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return this.left.isCompatible(context, type) || (this.right instanceof Type && this.right.isCompatible(context, type));

    }
}