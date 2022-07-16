import None from "./None";
import Value from "./Value";

export default class MapValue extends Value {

    readonly map: Map<Value, Value>;

    constructor(map: Map<Value, Value>) {
        super();

        this.map = map;
    }

    get(key: Value) { return this.map.has(key) ? this.map.get(key) as Value : new None("unknownkey"); }

    toString() { return `{${Array.from(this.map.keys()).map(k => `${k.toString()}:${(this.map.get(k) as Value).toString()}`).join(" ")}}`; }

}