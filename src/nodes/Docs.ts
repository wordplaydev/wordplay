import Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Doc from "./Doc";
import type LanguageCode from "./LanguageCode";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";

export default class Docs extends Node {
    
    readonly docs: Doc[];

    constructor(docs?: Doc[] | Translations) {
        super();

        this.docs = docs === undefined ? [] : 
                    Array.isArray(docs) ? docs : 
                    Object.keys(docs).map(lang => new Doc(docs[lang as LanguageCode], lang));

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "docs", types: [[Doc]] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Docs(
            this.replaceChild<Doc[]>("docs", this.docs, original, replacement), 
        ) as this;
    }

    computeConflicts() {

        // Docs must have unique language tags
        const duplicates = this.docs
            .filter(doc1 => this.docs.find(doc2 => doc1 !== doc2 && doc1.getLanguage() === doc2.getLanguage()) !== undefined)
            .map(doc => doc.lang);
        if(duplicates.length > 0)
            return [ new DuplicateLanguages(this, duplicates) ];
    }

    getTranslations(): Translations {

        const translations: Record<string, string | undefined> = {};
        for(const docs of this.docs) {
            translations[docs.getLanguage() ?? ""] = docs.docs.getText();
        }
        return translations as Translations;
    
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "documentation"
        }
    }

}