import type Conflict from "../conflicts/Conflict";
import type Alias from "./Alias";
import type { ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";

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

}