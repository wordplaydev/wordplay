import Alias from "../nodes/Alias";
import SetOrMapType from "../nodes/SetOrMapType";
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

    get(key: Value) { 
        const kv = this.values.find( kv2 => kv2[0].isEqualTo(key));
        // TODO Localize
        return kv === undefined ? new None([new Alias("unknownkey")]) : kv[1];
    }

    getKeys() { 
        return this.values.map(kv => kv[0]);
    }

    getValues() { 
        return this.values.map(kv => kv[1]);
    }

    getType() { return new SetOrMapType(); }
    getNativeTypeName(): string { return "map" }

    toString() { return `{${Array.from(this.values).sort().map(k => `${k[0].toString()}:${(this.get(k[0]) as Value).toString()}`).join(" ")}}`; }

}