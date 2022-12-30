import Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Doc from "./Doc";
import type LanguageCode from "./LanguageCode";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import type Language from "./Language";
import { DOCS_SYMBOL } from "../parser/Tokenizer";

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

    clone(original?: Node, replacement?: Node) { 
        return new Docs(
            this.replaceChild<Doc[]>("docs", this.docs, original, replacement), 
        ) as this;
    }

    computeConflicts() {

        // Docs must have unique language tags
        const duplicates = this.docs
            .filter(doc1 => this.docs.find(doc2 => doc1 !== doc2 && doc1.getLanguage() === doc2.getLanguage()) !== undefined)
            .map(doc => doc.lang)
            .filter((lang): lang is Language => lang !== undefined);
        if(duplicates.length > 0)
            return [ new DuplicateLanguages(this, duplicates) ];
    }

    getTranslations(): Translations {

        const translations: Record<string, string | undefined> = {};
        for(const docs of this.docs) {
            let text = docs.docs.getText();
            if(text.charAt(0) === DOCS_SYMBOL) text = text.substring(1);
            if(text.charAt(text.length - 1) === DOCS_SYMBOL) text = text.substring(0, text.length - 1);
            translations[docs.getLanguage() ?? ""] = text;
        }
        return translations as Translations;
    
    }

    getTranslation(lang: LanguageCode[]): string {
        const translations = this.getTranslations();
        const preferredTranslation = lang.find(l => l in translations);
        const defaultTranslation = Object.values(translations)[0] ?? "—";
        return preferredTranslation === undefined ? defaultTranslation : translations[preferredTranslation] ?? defaultTranslation;
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "documentation"
        }
    }

}