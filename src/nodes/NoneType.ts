import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type Type from "./Type";

export default class NoneType extends NativeType {

    readonly none: Token;

    constructor(none?: Token) {
        super();

        this.none = none ?? new Token(NONE_SYMBOL, TokenType.NONE_TYPE);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "none", types:[ Token ] },
        ];
    }

    computeConflicts() {}

    accepts(type: Type): boolean { 
        return type instanceof NoneType;
    }

    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new NoneType(
            this.cloneOrReplaceChild(pretty, [ Token ], "none", this.none, original, replacement)
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