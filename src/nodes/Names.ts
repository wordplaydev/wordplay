import Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type LanguageCode from "./LanguageCode";
import Name from "./Name";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import DuplicateNames from "../conflicts/DuplicateNames";

export default class Names extends Node {
    
    readonly names: Name[];

    constructor(names?: Name[] | Translations) {
        super();

        this.names = names === undefined ? [] : 
                    Array.isArray(names) ? names : 
                    Object.keys(names).map(lang => new Name(names[lang as LanguageCode], lang));
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Names(
            this.cloneOrReplaceChild<Name[]>(pretty, [ Name ], "names", this.names, original, replacement)
                .map((alias: Name, index: number) => alias.withPrecedingSpaceIfDesired(pretty && index === 0)), 
        ) as this; 
    }

    computeChildren() { return this.names.slice(); }

    computeConflicts() {

        // Names must be unique.
        const duplicateNames = this.names
            .filter(name1 => this.names.find(name2 => name1 !== name2 && name1.getName() === name2.getName()) !== undefined)
        if(duplicateNames.length > 0)
            return [ new DuplicateNames(this, duplicateNames) ];

        // Names must have unique language tags.
        const duplicateLanguages = this.names
            .filter(name1 => this.names.find(name2 => name1 !== name2 && name1.getLanguage() === name2.getLanguage()) !== undefined)
            .map(name => name.lang);
        if(duplicateLanguages.length > 0)
            return [ new DuplicateLanguages(this, duplicateLanguages) ];
    
    }

    sharesName(names: Names) { return this.names.find(name => name.name && names.hasName(name.name.getText())) !== undefined; }
    
    getTranslations() {
        const translations: Record<string, string | undefined> = {};
        for(const name of this.names) {
            translations[name.getLanguage() ?? ""] = name.getName();
        }
        return translations as Translations;
    }

    getTranslation(language: string | string[]) {
        const preferredTranslation = (Array.isArray(language) ? language : [ language ])
            .map(lang => this.names.find(name => name.getLanguage() === lang))
            .find(name => name !== undefined && name.getName() !== undefined);
        return preferredTranslation?.getName() ?? this.names[0].getName() ?? "—";
    }

    getNames() { return this.names.map(a => a.getName()).filter(n => n !== undefined) as string[]; }

    hasName(name: string) {
        return this.names.find(a => a.getName() === name) !== undefined;
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "names"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(){ return undefined; }
    getChildRemoval() { return undefined; }

}