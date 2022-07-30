import { ListStructureType } from "../native/ListStructureType";
import Alias from "../nodes/Alias";
import Language from "../nodes/Language";
import type Measurement from "./Measurement";
import None from "./None";
import Value from "./Value";

export const outOfBoundsAliases = [ new Alias("indexoutofbounds", new Language("eng")) ];

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