import Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import { TYPE_VAR_SYMBOL } from "../parser/Tokenizer";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Names from "./Names";
import type LanguageCode from "./LanguageCode";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly names: Names;

    constructor(names: Names | Translations, type?: Token) {
        super();

        this.type = type ?? new Token(TYPE_VAR_SYMBOL, TokenType.TYPE_VAR);
        this.names = names instanceof Names ? names : new Names(names);
    }

    getGrammar() { 
        return [
            { name: "type", types:[ Token ] },
            { name: "names", types:[ Names ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TypeVariable(
            this.cloneOrReplaceChild(pretty, [ Names ], "names", this.names, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "type", this.type, original, replacement)
        ) as this; 
    }

    getNames() { return this.names.getNames(); }
    hasName(name: string) { return this.names.hasName(name); }
    getTranslation(languages: LanguageCode[]) { return this.names.getTranslation(languages); }

    computeConflicts() {}

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