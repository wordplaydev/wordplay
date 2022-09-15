import type Conflict from "../conflicts/Conflict";
import { Placeholder } from "../conflicts/Placeholder";
import type { ConflictContext } from "./Node";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";

export default class TypePlaceholder extends Type {

    readonly etc: Token;

    constructor(etc: Token) {
        super();

        this.etc = etc;
    }

    computeChildren() {
        return [ this.etc ];
    }

    computeConflicts(context: ConflictContext): Conflict[] { return [ new Placeholder(this) ]; }

    isCompatible(context: ConflictContext, type: Type): boolean { return false; }

    getNativeTypeName(): string { return ""; }

    clone(original?: Node, replacement?: Node) { 
        return new TypePlaceholder(
            this.etc.cloneOrReplace([ Token ], original, replacement)
        ) as this; }

}