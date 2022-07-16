import Value from "./Value";

export default class NoOp extends Value {

    constructor() { super(); }

    toString(): string {
        return "<noop>";
    }

}