import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import type Context from "./Context";
import Token from "./Token";
import type Node from "./Node";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { OR_SYMBOL } from "../parser/Tokenizer";

export default class UnionType extends Type {

    readonly left: Type;
    readonly or: Token;
    readonly right: Type | Unparsable;

    constructor(left: Type, right: Type | Unparsable, or?: Token) {
        super();

        this.left = left;
        this.or = or ?? new Token(OR_SYMBOL, [ TokenType.UNION ]);
        this.right = right;
    }

    computeChildren() {
        return [ this.left, this.or, this.right ];
    }

    isCompatible(type: Type, context: Context): boolean {
        return this.left.isCompatible(type, context) && (!(this.right instanceof Type) || this.right.isCompatible(type, context));
    }

    getConversion(context: Context, type: Type): ConversionDefinition | undefined {
        const left = context.native?.getConversion(this.left.getNativeTypeName(), context, type);
        if(left !== undefined) return left;
        return this.right instanceof Type ? context.native?.getConversion(this.right.getNativeTypeName(), context, type) : undefined;
    }

    getFunction(context: Context, name: string): FunctionDefinition | undefined {
        const left = context.native?.getFunction(this.left.getNativeTypeName(), name);
        if(left !== undefined) return left;
        return this.right instanceof Type ? context.native?.getFunction(this.right.getNativeTypeName(), name) : undefined;
    }

    getNativeTypeName(): string { return "union"; }

    clone(original?: Node, replacement?: Node) { 
        return new UnionType(
            this.left.cloneOrReplace([ Type ], original, replacement), 
            this.right.cloneOrReplace([ Type, Unparsable ], original, replacement), 
            this.or.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    computeConflicts() {}
    
}

/** Given a list of types, remove all duplicates, and if only one remains, return it.
 *  Otherwise, create a union type that contains all of the unique types.
 */
export function getPossibleUnionType(context: Context, types: Type[]): Type | undefined {

    if(types.length === 0) return undefined;

    const uniqueTypes: Type[] = [];
    types.forEach(type => {
        if(uniqueTypes.length === 0 || uniqueTypes.every(t => !t.isCompatible(type, context)))
            uniqueTypes.push(type);
    })

    // If there's just one, return it.
    if(uniqueTypes.length === 1)
        return uniqueTypes[0];

    // Otherwise construct a nested union type of all of them.
    let union = uniqueTypes[0];
    do {
        uniqueTypes.shift();
        if(uniqueTypes.length > 0)
            union = new UnionType(union, uniqueTypes[0]);
    } while(uniqueTypes.length > 0);
    return union;
    
}