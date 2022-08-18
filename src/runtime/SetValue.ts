import SetOrMapType from "../nodes/SetOrMapType";
import Bool from "./Bool";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class SetValue extends Primitive {

    readonly values: Value[];

    constructor(values: Value[]) {
        super();

        this.values = [];
        values.forEach(v => {
            if(this.values.find(v2 => v.isEqualTo(v2)) === undefined)
                this.values.push(v);
        });

    }

    has(key: Value) { 
        return new Bool(this.values.find(v => key.isEqualTo(v)) !== undefined);
    }

    add(element: Value) { 
        return new SetValue([ ...this.values, element]);
    }

    remove(element: Value) { 
        return new SetValue(this.values.filter(v => !v.isEqualTo(element)));
    }

    union(set: SetValue) { 

        const values = this.values.slice();        
        set.values.forEach(v => { if(values.find(e => e.isEqualTo(v)) === undefined) values.push(v); });
        return new SetValue(values);
    }

    intersection(set: SetValue) { 

        const values: Value[] = [];
        this.values.forEach(v => { if(set.values.find(e => e.isEqualTo(v)) !== undefined) values.push(v); });
        return new SetValue(values);
    }

    difference(set: SetValue) { 
        // Remove any values from this set that occur in the given set.
        return new SetValue(this.values.filter(v1 => set.values.find(v2 => v1.isEqualTo(v2)) === undefined));
    }

    getType() { return new SetOrMapType(); }
    getNativeTypeName(): string { return "set" }

    toString() { return `{${Array.from(this.values).join(" ")}}`; }

}