import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { TYPE_VAR_SYMBOL } from "../parser/Tokenizer";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(name: Token | string, type?: Token) {
        super();

        this.type = type ?? new Token(TYPE_VAR_SYMBOL, TokenType.TYPE_VAR);
        this.name = name instanceof Token ? name : new NameToken(name);
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TypeVariable(
            this.cloneOrReplaceChild(pretty, [ Token ], "name", this.name, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "type", this.type, original, replacement)
        ) as this; 
    }

    getName() { return this.name.getText(); }
    getNames() { return [ this.name.getText() ]; }
    hasName(name: string) { return this.getName() === name; }
    getTranslation() { return this.name.getText(); }

    computeConflicts() {}

    computeChildren() {
        return [ this.type, this.name ];
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A variable type"
        }
    }

}