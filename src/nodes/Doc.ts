import Language from "./Language";
import Node from "./Node";
import Token from "./Token";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import DocToken from "./DocToken";

export default class Doc extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs?: Token | string, lang?: Language | string) {
        super();

        this.docs = docs instanceof Token ? docs : new DocToken(docs ?? "");
        this.lang = lang instanceof Language ? lang : lang === undefined ? undefined : Language.make(lang ?? "");

        this.computeChildren();
    }
    
    getGrammar() { 
        return [
            { name: "docs", types:[ Token ] },
            { name: "lang", types:[ Language, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Doc(
            this.replaceChild("docs", this.docs, original, replacement), 
            this.replaceChild("lang", this.lang, original, replacement)
        ) as this; 
    }

    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    
    computeConflicts() {}

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Documentation"
        }
    }

}