import { EXCEPTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import ExceptionType from "../nodes/ExceptionType";
import type Node from "../nodes/Node";
import Primitive from "./Primitive";

export enum ExceptionKind {
    NOT_IMPLEMENTED,
    UNPARSABLE,
    PLACEHOLDER,
    EXPECTED_TYPE,
    EXPECTED_EXPRESSION,
    EXPECTED_VALUE,
    EXPECTED_STRUCTURE,
    EXPECTED_FUNCTION,
    EXPECTED_CONTEXT,
    UNKNOWN_NAME,
    UNKNOWN_OPERATOR,
    UNKNOWN_CONVERSION,
    UNKNOWN_SHARE,
    EXISTING_SHARE,
    POSSIBLE_INFINITE_RECURSION
}

export default class Exception extends Primitive {

    readonly node?: Node;
    readonly exception: ExceptionKind;
    readonly message?: string | undefined;

    constructor(node: Node | undefined, exception: ExceptionKind, message?: string) {
        super();

        this.node = node;
        this.exception = exception;
        this.message = message;
    }

    getType() { return new ExceptionType(this); }
    getNativeTypeName(): string { return EXCEPTION_NATIVE_TYPE_NAME; }

    toString() { return `${ExceptionKind[this.exception]}: ${this.message} ${this.node === undefined ? "" : this.node.toWordplay().trim()}`; }

}