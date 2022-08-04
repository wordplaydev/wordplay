import SetOrMapType from "../nodes/SetOrMapType";
import Bool from "./Bool";
import Value from "./Value";

export default class SetValue extends Value {

    readonly values: Value[];

    constructor(values: Value[]) {
        super();

        this.values = [];
        values.forEach(v => {
            if(this.values.find(v2 => v.isEqualTo(v2)) === undefined)
                this.values.push(v);

        });

    }

    get(key: Value) { 
        return new Bool(this.values.find(v => key.isEqualTo(v)) !== undefined);
    }

    getType() { return new SetOrMapType(); }

    toString() { return `{${Array.from(this.values).sort().join(" ")}}`; }

}