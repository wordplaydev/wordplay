import Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Names from "./Names";
import type LanguageCode from "./LanguageCode";

export default class TypeVariable extends Node {

    readonly names: Names;

    constructor(names: Names) {
        super();

        this.names = names;

        this.computeChildren();

    }

    static make(names: Translations) {
        return new TypeVariable(
            Names.make(names),
        );
    }

    getGrammar() { 
        return [
            { name: "names", types:[ Names ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new TypeVariable(
            this.replaceChild("names", this.names, original, replacement), 
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