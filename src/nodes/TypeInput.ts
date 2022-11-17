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
import Unparsable from "./Unparsable";

export default class TypeInput extends Node {

    readonly dot: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, dot?: Token) {
        super();

        this.dot = dot ?? new TypeToken();
        this.type = type;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "dot", types:[ Token ] },
            { name: "type", types:[ Type, Unparsable ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new TypeInput(
            this.cloneOrReplaceChild(pretty, "type", this.type, original, replacement),
            this.cloneOrReplaceChild(pretty, "dot", this.dot, original, replacement)
        ).label(this._label) as this; 
    }

    computeConflicts() {}
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.type) return new Replace(context.source, this, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A type input"
        }
    }

}