import type { Token } from "./Token";
import Type from "./Type";

export default class NoneType extends Type {

    readonly none: Token;
    readonly name?: Token;

    constructor(none: Token, name?: Token) {
        super();

        this.none = none;
        this.name = name;
    }

    getChildren() {
        return this.name ? [ this.none, this.name ] : [ this.none ];
    }

}