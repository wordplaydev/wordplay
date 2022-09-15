import Expression from "../nodes/Expression";
import type Node from "../nodes/Node";

export default abstract class HOF extends Expression {

    computeChildren() { return []; }
    clone(original?: Node | undefined, replacement?: Node | undefined): this { return this; }

}

