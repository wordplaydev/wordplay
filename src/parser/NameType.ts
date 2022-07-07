import type { Token } from "./Token";
import Type from "./Type";

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;
    }

    getChildren() {
        return [ this.type ];
    }

}