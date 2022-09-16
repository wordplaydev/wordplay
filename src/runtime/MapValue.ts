import { MAP_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import Alias from "../nodes/Alias";
import MapType from "../nodes/MapType";
import Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class MapValue extends Primitive {

    readonly values: [Value, Value][];

    constructor(values: [Value, Value][]) {
        super();

        this.values = [];
        values.forEach(kv => {
            if(this.values.find( kv2 => kv2[0].isEqualTo(kv[0])) === undefined)
                this.values.push(kv);
        });

    }

    size() { 
        return new Measurement(this.values.length);
    }

    has(key: Value) { 
        const kv = this.values.find( kv2 => kv2[0].isEqualTo(key));
        // TODO Localize
        return kv === undefined ? new None([new Alias("unknownkey")]) : kv[1];
    }

    set(key: Value, value: Value) {
        let hasKey = false;
        const values: [Value, Value][] = this.values.map(kv => {
            if(kv[0].isEqualTo(key)) {
                hasKey = true;
                return [ key, value ];
            }
            else return kv.slice();
        }) as [Value, Value][];
        if(!hasKey)
            values.push([ key, value ]);
        return new MapValue(values);
    }

    unset(key: Value) {
        return new MapValue(this.values.filter(kv => !kv[0].isEqualTo(key)));
    }

    remove(value: Value) {
        return new MapValue(this.values.filter(kv => !kv[1].isEqualTo(value)));
    }

    getKeys() { 
        return this.values.map(kv => kv[0]);
    }

    getValues() { 
        return this.values.map(kv => kv[1]);
    }

    getType() { return new MapType(); }
    
    getNativeTypeName(): string { return MAP_NATIVE_TYPE_NAME; }

    toString() { return `{${Array.from(this.values).sort().map(k => `${k[0].toString()}:${(this.has(k[0]) as Value).toString()}`).join(" ")}}`; }

}