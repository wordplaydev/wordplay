import Token from "./Token";
import type Node from "./Node";
import TokenType from "./TokenType";
import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { BOOLEAN_TYPE_SYMBOL } from "../parser/Tokenizer";
import NativeType from "./NativeType";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type TypeSet from "./TypeSet";

export default class BooleanType extends NativeType {

    readonly type: Token;

    constructor(type?: Token) {
        super();

        this.type = type ?? new Token(BOOLEAN_TYPE_SYMBOL, TokenType.BOOLEAN_TYPE);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "type", types:[ Token ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new BooleanType(
            this.replaceChild("type", this.type, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet) { return types.list().every(type => type instanceof BooleanType); }

    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A boolean type"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }
    
}