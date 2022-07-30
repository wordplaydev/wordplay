import MapStructureType from "../native/MapStructureType";
import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import None from "./None";
import Value from "./Value";

export default class MapValue extends Value {

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
        return kv === undefined ? new None("unknownkey") : kv[1];
    }

    getType() { return MapStructureType; }

    toString() { return `{${Array.from(this.values).sort().map(k => `${k[0].toString()}:${(this.get(k[0]) as Value).toString()}`).join(" ")}}`; }

}