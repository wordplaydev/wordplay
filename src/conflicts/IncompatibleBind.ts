import type Expression from "../nodes/Expression";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleBind extends Conflict {
    readonly type: Type;
    readonly value: Expression;
    constructor(type: Type, value: Expression) {
        super(false);
        this.type = type;
        this.value = value;
    }
}
