import Node from "./Node";
import type Context from "./Context";
import Bind from "../nodes/Bind";
import Token from "./Token";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnknownType from "./UnknownType";

export default class Column extends Node {

    readonly bar: Token;
    readonly bind?: Bind;

    constructor(bar: Token, bind?: Bind) {
        super();

        this.bar = bar;
        this.bind = bind;

        this.computeChildren();
    }

    getGrammar() { 
        return [
            { name: "bar", types: [ Token ] },
            { name: "bind", types: [ Bind, undefined ] },
        ]; 
    }

    computeConflicts() {}

    hasDefault() { return this.bind instanceof Bind && this.bind.hasDefault(); }
    getType(context: Context) { return this.bind === undefined ? new UnknownType(this) : this.bind.getTypeUnlessCycle(context); }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Column(
            this.replaceChild(pretty, "bar", this.bar, original, replacement), 
            this.replaceChild(pretty, "bind", this.bind, original, replacement)
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