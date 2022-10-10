import ListType from "../nodes/ListType";
;import { outOfBoundsAliases } from "../runtime/Constants";
import Bool from "./Bool";
import Text from "./Text";
import Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";
import { LIST_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { getPossibleUnionType } from "../nodes/UnionType";
import type Context from "../nodes/Context";

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

    length() { return new Measurement(this.values.length); }

    has(value: Value) { 
        return new Bool(this.values.find(v => value.isEqualTo(v)) !== undefined);
    }

    isEqualTo(value: Value): boolean {
        return value instanceof List && this.values.length === value.values.length && this.values.every((v, index) => value.values[index].isEqualTo(v));
    }

    random() { 
        return this.values[Math.floor(Math.random() * this.values.length)];
    }

    join(separator: Text) { 
        return new Text(this.values.map(v => v instanceof Text ? v.text : v.toString()).join(separator.text));
    }

    add(value: Value) { return new List([...this.values, value]); }

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

    append(value: Value) { return new List([ ...this.values, value ]); }

    getType(context: Context) { return new ListType(getPossibleUnionType(context, this.values.map(v => v.getType(context))),); }

    getNativeTypeName(): string { return LIST_NATIVE_TYPE_NAME; }

    toString() {
        return `[${this.values.map(v => v.toString()).join(" ")}]`
    }

}