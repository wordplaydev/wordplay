import Replace from "../transforms/Replace";
import type Transform from "../transforms/Transform";
import type Context from "./Context";
import Node from "./Node";
import Token from "./Token";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";
import TypePlaceholder from "./TypePlaceholder";
import TypeToken from "./TypeToken";

export default class TypeInput extends Node {

    readonly dot: Token;
    readonly type: Type;

    constructor(type: Type, dot?: Token) {
        super();

        this.dot = dot ?? new TypeToken();
        this.type = type;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "dot", types:[ Token ] },
            { name: "type", types:[ Type ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new TypeInput(
            this.replaceChild(pretty, "type", this.type, original, replacement),
            this.replaceChild(pretty, "dot", this.dot, original, replacement)
        ) as this; 
    }

    computeConflicts() {}
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.type) return new Replace(context, this, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A type input"
        }
    }

}