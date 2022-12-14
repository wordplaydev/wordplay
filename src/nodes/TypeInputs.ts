import Node from "./Node";
import Token from "./Token";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";

export default class TypeInputs extends Node {

    readonly open: Token;
    readonly types: Type[];
    readonly close: Token | undefined;

    constructor(open: Token, types: Type[], close: Token | undefined) {
        super();

        this.open = open;
        this.types = types;
        this.close = close;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "open", types: [ Token ] },
            { name: "types", types: [[ Type ]] },
            { name: "close", types: [ Token, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new TypeInputs(
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("types", this.types, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts() {}
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A list of type inputs"
        }
    }

}