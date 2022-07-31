import { ListStructureType } from "../native/ListStructureType";
import { outOfBoundsAliases } from "../runtime/Constants";
import type Measurement from "./Measurement";
import None from "./None";
import Value from "./Value";

export default class List extends Value {

    readonly values: Value[] = [];

    constructor(values: Value[]) {
        super();

        this.values = values.slice();
    }

    getValues() { return this.values; }

    get(index: Measurement) {
        const value = this.values[index.toNumber() - 1];
        // TODO Localize
        return value === undefined ? new None(outOfBoundsAliases) : value;
    }

    getType() { return ListStructureType; }

    toString() {
        return `[${this.values.map(v => v.toString()).join(" ")}]`
    }

}