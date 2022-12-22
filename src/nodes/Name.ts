import Node from "./Node";
import Token from "./Token";
import type Conflict from "../conflicts/Conflict";
import Language from "./Language";
import type Context from "./Context";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";
import type LanguageCode from "./LanguageCode";
import NameToken from "./NameToken";
import PlaceholderToken from "./PlaceholderToken";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export const NameLabels: Translations = {
    "😀": TRANSLATE,
    eng: "name"
};

export default class Name extends Node {

    readonly separator?: Token;
    readonly name: Token;
    readonly lang?: Language;

    constructor(separator: Token | undefined, name: Token, lang?: Language) {
        super();

        this.separator = separator;
        this.name = name;
        this.lang = lang;

        this.computeChildren();
        
    }

    static make(name?: string) {
        return new Name(undefined, name ? new NameToken(name) : new PlaceholderToken(), );
    }

    getGrammar() { 
        return [
            { name: "separator", types:[ Token, undefined ] },
            { name: "name", types:[ Token ] },
            { name: "lang", types:[ Language, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Name(
            this.replaceChild("separator", this.separator, original, replacement),
            this.replaceChild("name", this.name, original, replacement), 
            this.replaceChild("lang", this.lang, original, replacement),
        ) as this;
    }

    computeConflicts(): Conflict[] { return []; }

    getName(): string | undefined { return this.name instanceof Token ? this.name.text.toString() : this.name; }
    getLanguage() { return this.lang === undefined ? undefined : this.lang.getLanguage(); }
    isLanguage(lang: LanguageCode) { return this.getLanguage() === lang as LanguageCode; }

    equals(alias: Name) { 

        const thisLang = this.lang;
        const thatLang = alias.lang;

        return this.getName() === alias.getName() && (
            (thisLang === undefined && thatLang === undefined) ||
            (thisLang !== undefined && thatLang !== undefined && thisLang.equals(thatLang))
        );
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A name"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        const project = context.project;
        // Formats can be any Language tags that are used in the project.
        if(child === this.lang && project !== undefined)
            return getPossibleLanguages(project).map(lang => new Replace(context, child, Language.make(lang)));

        }

    getInsertionBefore(): Transform[] | undefined { return undefined; }

    getInsertionAfter(context: Context, position: number): Transform[] | undefined {

        const project = context.project;
        // Suggest languages for insertion if after the name with no language.
        if(this.lang === undefined && project !== undefined)
            return getPossibleLanguages(project).map(lang => new Add(context, position, this, "lang", Language.make(lang)));

    }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        
        if(child === this.name) return new Replace(context, child, new PlaceholderToken());
        else if(child === this.lang) return new Remove(context, this, this.lang);

    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.name) return NameLabels;
    }

}

