import Expression from "../nodes/Expression";

export default abstract class HOF extends Expression {

    computeChildren() { return []; }
    clone(): this { return this; }

}

