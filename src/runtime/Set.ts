import { SET_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Context from "../nodes/Context";
import SetType from "../nodes/SetType";
import { getPossibleUnionType } from "../nodes/UnionType";
import Bool from "./Bool";
import Measurement from "./Measurement";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class Set extends Primitive {

    readonly values: Value[];

    constructor(values: Value[]) {
        super();

        this.values = [];
        values.forEach(v => {
            if(this.values.find(v2 => v.isEqualTo(v2)) === undefined)
                this.values.push(v);
        });

    }

    size() {
        return new Measurement(this.values.length);
    }

    has(key: Value) { 
        return new Bool(this.values.find(v => key.isEqualTo(v)) !== undefined);
    }

    add(element: Value) { 
        return new Set([ ...this.values, element]);
    }

    remove(element: Value) { 
        return new Set(this.values.filter(v => !v.isEqualTo(element)));
    }

    union(set: Set) { 

        const values = this.values.slice();        
        set.values.forEach(v => { if(values.find(e => e.isEqualTo(v)) === undefined) values.push(v); });
        return new Set(values);
    }

    intersection(set: Set) { 

        const values: Value[] = [];
        this.values.forEach(v => { if(set.values.find(e => e.isEqualTo(v)) !== undefined) values.push(v); });
        return new Set(values);
    }

    difference(set: Set) { 
        // Remove any values from this set that occur in the given set.
        return new Set(this.values.filter(v1 => set.values.find(v2 => v1.isEqualTo(v2)) === undefined));
    }

    isEqualTo(set: Value): boolean {
        return set instanceof Set && set.values.length === this.values.length && this.values.every(val => set.has(val));
    }

    getType(context: Context) { return new SetType(undefined, undefined, getPossibleUnionType(context, this.values.map(v => v.getType(context)))); }

    getNativeTypeName(): string { return SET_NATIVE_TYPE_NAME; }

    toString() { return `{${Array.from(this.values).join(" ")}}`; }

}