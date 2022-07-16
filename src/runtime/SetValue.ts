import Bool from "./Bool";
import Value from "./Value";

export default class SetValue extends Value {

    readonly set: Set<any>;

    constructor(set: Set<any>) {
        super();

        this.set = set;
    }

    get(key: Value) { return new Bool(this.set.has(key))}

    toString() { return `{${Array.from(this.set).join(" ")}}`; }

}