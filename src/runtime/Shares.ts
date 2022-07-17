import Exception, { ExceptionType } from "./Exception";
import type Value from "./Value";

export default class Shares {

    readonly values: Map<string, Value>;

    constructor() {

        this.values = new Map();

    }

    bind(name: string, value: Value): Exception | undefined {
        if(this.values.has(name)) 
            return new Exception(ExceptionType.EXISTING_SHARE);
        this.values.set(name, value);
    }

    resolve(name: string, version?: number): Value {
        // TODO Resolve Native shares
        // TODO Resolve web shares
        return new Exception(ExceptionType.UNKNOWN_SHARE);
    }

}