import Alias from "./Alias";
import AnyType from "./AnyType";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";

export default class NoneType extends Type {

    readonly none: Token;
    readonly aliases: Alias[];

    constructor(aliases: Alias[], none?: Token) {
        super();

        this.none = none ?? new Token("!", [ TokenType.NONE_TYPE ]);
        this.aliases = aliases;
    }

    computeChildren() {
        return this.none === undefined ? [ ...this.aliases ] : [ this.none, ...this.aliases ];
    }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        if(type instanceof AnyType) return true;
        // No if it's not a none type.
        if(!(type instanceof NoneType)) return false;
        // Yes if there are no aliases for either.
        if(this.aliases.length === 0 && type.aliases.length === 0) return true;
        // Otherwise, yes if they have an intersecting alias.
        return this.aliases.find(a => type.aliases.find(b => a.isCompatible(b)) !== undefined) !== undefined;
    }

    getNativeTypeName(): string { return "none"; }

    toWordplay(): string {
        return "•!" + this.aliases.map(a => a.getName());
    }

    getDefinition(context: ConflictContext, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new NoneType(
            this.aliases.map(a => a.cloneOrReplace([ Alias ], original, replacement))) as this; 
        }

}