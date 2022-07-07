import type { Token } from "./Token";
import Type from "./Type";

export default class OopsType extends Type {

    readonly type: Token;
    readonly name?: Token;

    constructor(type: Token, name?: Token) {
        super();

        this.type = type;
        this.name = name;
    }

    getChildren() {
        return this.name ? [ this.type, this.name ] : [ this.type ];
    }

}