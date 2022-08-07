import ListType, { ListFunctions } from "../nodes/ListType";
import { outOfBoundsAliases } from "../runtime/Constants";
import FunctionValue from "./FunctionValue";
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

    first() { return this.values.length === 0 ? new None(outOfBoundsAliases) : this.values[0]; }
    last() { return this.values.length === 0 ? new None(outOfBoundsAliases) : this.values[this.values.length - 1];}
    sansFirst() { return new List(this.values.slice(1)); }
    sansLast() { return new List(this.values.slice(0, -1)); }

    resolve(name: string): Value | undefined {
        const fun = ListFunctions.find(f => f.hasName(name));
        if(fun !== undefined) return new FunctionValue(fun, this);
    }

    getType() { return new ListType(); }

    toString() {
        return `[${this.values.map(v => v.toString()).join(" ")}]`
    }

}