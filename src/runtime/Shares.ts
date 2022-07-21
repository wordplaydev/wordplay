import Exception, { ExceptionType } from "./Exception";
import Stream from "./Stream";
import type Value from "./Value";

export default class Shares {

    readonly values: Map<string, Value>;

    constructor(bindings?: Record<string, Value>) {

        this.values = new Map();

        if(bindings)
            Object.keys(bindings).forEach(name => this.bind(name, bindings[name]));

    }

    getStreams(): Stream[] {
        return Array.from(this.values.values()).filter(v => v instanceof Stream) as Stream[];
    }

    bind(name: string, value: Value): Exception | undefined {
        if(this.values.has(name)) 
            return new Exception(ExceptionType.EXISTING_SHARE);
        this.values.set(name, value);
    }

    resolve(name: string, version?: number): Value {
        return this.values.has(name) ? this.values.get(name) as Value : new Exception(ExceptionType.UNKNOWN_SHARE);
    }

}