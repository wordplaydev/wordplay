import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import Name from "./Name";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type Type from "./Type";
import Names from "./Names";

export default class NoneType extends NativeType {

    readonly none: Token;
    readonly names: Names;

    constructor(names?: Names | Translations, none?: Token) {
        super();

        this.none = none ?? new Token(NONE_SYMBOL, TokenType.NONE_TYPE);
        this.names = names instanceof Names ? names : new Names(names);
    }

    computeConflicts() {}

    computeChildren() {
        return [ this.none, this.names ];
    }

    accepts(type: Type): boolean { 
        return type instanceof NoneType && (
            (this.names.names.length === 0 && type.names.names.length === 0) || 
            this.names.names.find(a => type.names.names.find(b => a.equals(b)) !== undefined) !== undefined
        );
    }

    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new NoneType(
            this.cloneOrReplaceChild(pretty, [ Name ], "aliases", this.names, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() {  return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A none type."
        }
    }

}