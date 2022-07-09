import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class SetType extends Type {

    readonly open: Token;
    readonly type: Type;
    readonly close: Token;
    readonly bind?: Token;
    readonly value?: Type;

    constructor(open: Token, type: Type, close: Token, bind?: Token, value?: Type) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
        this.bind = bind;
        this.value = value;
    }

    getChildren() {
        return this.bind && this.value ? [ this.open, this.type, this.bind, this.value, this.close ] : [ this.open, this.type, this.close ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}