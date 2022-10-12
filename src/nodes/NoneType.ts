import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import Alias from "./Alias";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";

export default class NoneType extends NativeType {

    readonly none: Token;
    readonly aliases: Alias[];

    constructor(aliases: Alias[], none?: Token) {
        super();

        this.none = none ?? new Token(NONE_SYMBOL, [ TokenType.NONE_TYPE ]);
        this.aliases = aliases;
    }

    computeConflicts() {}

    computeChildren() {
        return this.none === undefined ? [ ...this.aliases ] : [ this.none, ...this.aliases ];
    }

    accepts(type: Type): boolean { 
        return type instanceof NoneType && (
            (this.aliases.length === 0 && type.aliases.length === 0) || 
            this.aliases.find(a => type.aliases.find(b => a.equals(b)) !== undefined) !== undefined
        );
    }

    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    toWordplay(): string {
        return "!" + this.aliases.map(a => a.getName());
    }

    clone(original?: Node, replacement?: Node) { 
        return new NoneType(
            this.aliases.map(a => a.cloneOrReplace([ Alias ], original, replacement))
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A none type."
        }
    }


}