import { NONE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Alias from "../nodes/Alias";
import NoneType from "../nodes/NoneType";
import Value from "./Value";

export default class None extends Value {

    readonly aliases: Alias[];

    constructor(aliases: Alias[] = []) {
        super();
        this.aliases = aliases;
    }

    getType() { return new NoneType(this.aliases); }
    
    getNativeTypeName(): string { return NONE_NATIVE_TYPE_NAME; }

    resolve() { return undefined; }

    isEqualTo(value: Value) { return value instanceof None && this.aliases.every((val, index) => value.aliases[index].equals(val)); }

    toString() { return `!${this.aliases.map(a => `${a.getName()}${a.lang === undefined ? "" : "/" + a.getLanguage()}`).join(";")}`; }

}