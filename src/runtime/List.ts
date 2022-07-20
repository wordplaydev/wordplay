import type Measurement from "./Measurement";
import None from "./None";
import Value from "./Value";

export default class List extends Value {

    readonly values: Value[] = [];

    constructor(values: Value[]) {
        super();

        this.values = values.slice();
    }

    get(index: Measurement) {
        const value = this.values[index.toNumber() - 1];
        return value === undefined ? new None("indexoutofbounds") : value;
    }

    toString() {
        return `[${this.values.map(v => v.toString()).join(" ")}]`
    }

}