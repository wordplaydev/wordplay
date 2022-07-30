import type Conflict from "../parser/Conflict";
import type { ConflictContext } from "./Node";
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

    toWordplay(): string {
        return this.left.toWordplay() + " | " + this.right.toWordplay();
    }
}

/** Given a list of types, remove all duplicates, and if only one remains, return it.
 *  Otherwise, create a union type that contains all of the unique types.
 */
export function getPossibleUnionType(context: ConflictContext, types: Type[]): Type | undefined {

    if(types.length === 0) return undefined;

    const uniqueTypes: Type[] = [];
    types.forEach(type => {
        if(uniqueTypes.length === 0 || uniqueTypes.every(t => !t.isCompatible(context, type)))
            uniqueTypes.push(type);
    })

    // If there's just one, return it.
    if(uniqueTypes.length === 1)
        return uniqueTypes[0];

    // Otherwise construct a nested union type of all of them.
    let union = uniqueTypes[0];
    do {
        uniqueTypes.shift();
        union = new UnionType(union, uniqueTypes[0]);
    } while(uniqueTypes.length > 0);
    return union;
    
}