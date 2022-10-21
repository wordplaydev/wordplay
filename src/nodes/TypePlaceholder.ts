import type Conflict from "../conflicts/Conflict";
import Placeholder from "../conflicts/Placeholder";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import PlaceholderToken from "./PlaceholderToken";

export default class TypePlaceholder extends Type {

    readonly etc: Token;

    constructor(etc?: Token) {
        super();

        this.etc = etc ?? new PlaceholderToken();
    }

    computeChildren() {
        return [ this.etc ];
    }

    computeConflicts(): Conflict[] { return [ new Placeholder(this) ]; }

    accepts(): boolean { return false; }

    getNativeTypeName(): string { return "type_placeholder"; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TypePlaceholder(
            this.cloneOrReplaceChild(pretty, [ Token ], "etc", this.etc, original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A type placeholder"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}