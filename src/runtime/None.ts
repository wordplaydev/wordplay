import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import NoneType from "../nodes/NoneType";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import Value from "./Value";
import type Node from "../nodes/Node";

export default class None extends Value {

    constructor(creator: Node) {
        super(creator);
    }

    getType() { return new NoneType(); }
    
    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    isEqualTo(value: Value) { 
        return value instanceof None;
    }

    toWordplay() { return NONE_SYMBOL; }

}