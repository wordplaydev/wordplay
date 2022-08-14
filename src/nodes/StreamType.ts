import type Conflict from "../conflicts/Conflict";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class StreamType extends Type {

    readonly stream?: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, stream?: Token) {
        super();

        this.stream = stream;
        this.type = type;
    }

    getChildren() {
        return this.stream === undefined ? [ this.type ] : [ this.stream, this.type ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof StreamType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(context, type.type);
    }

    getNativeTypeName(): string { return "stream"; }

}