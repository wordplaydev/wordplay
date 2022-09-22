import type Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import Expression from "../nodes/Expression";
import type { TypeSet } from "../nodes/UnionType";

export default abstract class HOF extends Expression {

    computeConflicts() {}
    computeChildren() { return []; }
    clone(): this { return this; }
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { context; bind; original; return current; }

}

