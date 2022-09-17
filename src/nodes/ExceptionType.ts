import { EXCEPTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Exception from "../runtime/Exception";
import Type from "./Type";

export default class ExceptionType extends Type {

    readonly exception: Exception;

    constructor(exception: Exception) {
        super();

        this.exception = exception;

    }

    computeChildren() { return []; }

    getConflicts() { return []; }

    isCompatible(type: Type): boolean {
        return type instanceof ExceptionType && this.exception.constructor === type.exception.constructor;
    }

    getConversion() {
        return undefined;
    }

    getNativeTypeName(): string { return EXCEPTION_NATIVE_TYPE_NAME; }

    toWordplay(): string {
        return this.exception.toString();
    }

    clone() { return new ExceptionType(this.exception) as this; }

}