import ListType from "../nodes/ListType";
;import { outOfBoundsAliases } from "../runtime/Constants";
import type Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class List extends Primitive {

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
    sans(value: Value) { 
        const val = this.values.find(v => v.isEqualTo(value));
        return val === undefined ? this : new List(this.values.filter(v => v !== val));    
    }
    sansAll(value: Value) { 
        return new List(this.values.filter(v => !v.isEqualTo(value)));
    }
    reverse() { return new List(this.values.reverse()); }

    getType() { return new ListType(); }

    getNativeTypeName(): string { return "list" }

    toString() {
        return `[${this.values.map(v => v.toString()).join(" ")}]`
    }

}