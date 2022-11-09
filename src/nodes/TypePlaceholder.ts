import type Conflict from "../conflicts/Conflict";
import Placeholder from "../conflicts/Placeholder";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import PlaceholderToken from "./PlaceholderToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class TypePlaceholder extends Type {

    readonly placeholder: Token;

    constructor(etc?: Token) {
        super();

        this.placeholder = etc ?? new PlaceholderToken();
    }

    getChildNames() { return ["placeholder"]; }

    computeConflicts(): Conflict[] { return [ new Placeholder(this) ]; }

    accepts(): boolean { return false; }

    getNativeTypeName(): string { return "type_placeholder"; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TypePlaceholder(
            this.cloneOrReplaceChild(pretty, [ Token ], "etc", this.placeholder, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.placeholder) return {
            "😀": TRANSLATE,
            eng: "type"
        };
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A type placeholder"
        }
    }


}