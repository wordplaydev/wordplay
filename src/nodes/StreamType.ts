import type Conflict from "../parser/Conflict";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class StreamType extends Type {

    readonly dots: Token;
    readonly type: Type | Unparsable;

    constructor(dots: Token, type: Type | Unparsable) {
        super();

        this.dots = dots;
        this.type = type;
    }

    getChildren() {
        return [ this.dots, this.type ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof StreamType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(context, type.type);
    }

}