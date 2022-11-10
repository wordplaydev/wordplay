import type Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";

export default class UnknownType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }
    
    getGrammar() { return []; }

    computeConflicts() {}
    accepts() { return false; }
    getNativeTypeName(): string { return "unknown"; }

    toWordplay() { return "□"; }

    clone() { return new UnknownType(this.node) as this; }
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            eng: "An unknown type",
            "😀": `${TRANSLATE} •🤔`
        }
    }

}