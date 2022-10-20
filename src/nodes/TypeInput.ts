import Node from "./Node";
import Token from "./Token";
import Type from "./Type";
import TypeToken from "./TypeToken";
import Unparsable from "./Unparsable";

export default class TypeInput extends Node {

    readonly dot: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, dot?: Token) {
        super();

        this.dot = dot ?? new TypeToken();
        this.type = type;
    }

    clone(original?: Node | string, replacement?: Node) { 
        return new TypeInput(
            this.cloneOrReplaceChild([ Type, Unparsable ], "type", this.type, original, replacement),
            this.cloneOrReplaceChild([ Token ], "dot", this.dot, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.dot, this.type ];
    }

    computeConflicts() {}

    getDescriptions() {
        return {
            eng: "A type input"
        }
    }
    
    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}