import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class ListType extends Type {

    readonly open: Token;
    readonly type: Type;
    readonly close: Token;

    constructor(open: Token, type: Type, close: Token) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() { return [ this.open, this.type, this.close ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}