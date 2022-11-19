import Add from "../transforms/Add";
import Replace from "../transforms/Replace";
import type Context from "./Context";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import Language from "./Language";
import Node from "./Node";
import Token from "./Token";
import type Transform from "../transforms/Transform";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import DocToken from "./DocToken";

export default class Doc extends Node {
    
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs?: Token | string, lang?: Language | string) {
        super();

        this.docs = docs instanceof Token ? docs : new DocToken(docs ?? "");
        this.lang = lang instanceof Language ? lang : lang === undefined ? undefined : new Language(lang ?? "");

        this.computeChildren();
    }
    
    getGrammar() { 
        return [
            { name: "docs", types:[ Token ] },
            { name: "lang", types:[ Language, undefined ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Doc(
            this.replaceChild(pretty, "docs", this.docs, original, replacement), 
            this.replaceChild(pretty, "lang", this.lang, original, replacement)
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

    getChildReplacement(child: Node, context: Context) {

        const project = context.source.getProject();
        if(project !== undefined && child === this.lang)
            return getPossibleLanguages(project).map(l => new Replace(context.source, child, new Language(l)));
            
        return [];

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 

        const project = context.source.getProject();
        if(project !== undefined && this.lang === undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "lang", new Language(l)));

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.lang) return new Remove(context.source, this, child);
    }

}