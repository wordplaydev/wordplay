import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import SetOrMapType from "./SetOrMapType";
import type { Token } from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class SetAccess extends Expression {

    readonly setOrMap: Expression | Unparsable;
    readonly open: Token;
    readonly key: Expression | Unparsable;
    readonly close: Token;

    constructor(setOrMap: Expression | Unparsable, open: Token, key: Expression | Unparsable, close: Token) {
        super();

        this.setOrMap = setOrMap;
        this.open = open;
        this.key = key;
        this.close = close;
    }

    getChildren() {
        return [ this.setOrMap, this.open, this.key, this.close ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // Either a set or map type, and if so, the key or value's type.
        if(this.setOrMap instanceof Unparsable) return new UnknownType(this);
        const setOrMapType = this.setOrMap.getType(program);
        if(!(setOrMapType instanceof SetOrMapType)) return new UnknownType(this);
        if(setOrMapType.value !== undefined && setOrMapType.value instanceof Type) return setOrMapType.value;
        if(setOrMapType.key instanceof Type) return setOrMapType.key;
        return new UnknownType(this);
    }

}