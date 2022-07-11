import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open: Token;
    readonly type: Type | Unparsable;
    readonly close: Token;

    constructor(open: Token, type: Type | Unparsable, close: Token) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() { return [ this.open, this.type, this.close ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(type: Type): boolean {
        return type instanceof ListType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(type.type);
    }
}