import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";

export default class SetAccess extends Expression {

    readonly setOrMap: Expression;
    readonly open: Token;
    readonly key: Expression;
    readonly close: Token;

    constructor(setOrMap: Expression, open: Token, key: Expression, close: Token) {
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

}