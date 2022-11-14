import Node from "./Node";
import type Context from "./Context";
import Bind from "../nodes/Bind";
import Token from "./Token";
import Unparsable from "./Unparsable";
import UnknownType from "./UnknownType";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Column extends Node {

    readonly bar: Token;
    readonly bind: Bind | Unparsable;

    constructor(bar: Token, bind: Bind | Unparsable) {
        super();

        this.bar = bar;
        this.bind = bind;

        this.computeChildren();
    }

    getGrammar() { 
        return [
            { name: "bar", types:[ Token ] },
            { name: "bind", types:[ Bind, Unparsable ] },
        ]; 
    }

    computeConflicts() {}

    hasDefault() { return this.bind instanceof Bind && this.bind.hasDefault(); }
    getType(context: Context) { return this.bind instanceof Unparsable ? new UnknownType(this.bind) : this.bind.getTypeUnlessCycle(context); }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Column(
            this.cloneOrReplaceChild(pretty, [ Token ], "bar", this.bar, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "bind", this.bind, original, replacement)
        ) as this; 
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A table column"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }
}