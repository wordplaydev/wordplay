import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Names from "../nodes/Names";
import NoneType from "../nodes/NoneType";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import Value from "./Value";

export default class None extends Value {

    readonly names?: Names;

    constructor(names?: Names) {
        super();
        this.names = names;
    }

    getType() { return new NoneType(this.names); }
    
    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    isEqualTo(value: Value) { 
        return value instanceof None && 
        ((this.names === undefined && value.names === undefined) || 
         (this.names !== undefined && value.names !== undefined && this.names.names.every((val, index) => value.names !== undefined && value.names.names[index].equals(val))));
    }

    toString() { return `${NONE_SYMBOL}${this.names?.toWordplay() ?? ""}`; }

}