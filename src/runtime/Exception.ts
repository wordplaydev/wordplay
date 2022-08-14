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

    constructor(node: Node | undefined, exception: ExceptionKind) {
        super();

        this.node = node;
        this.exception = exception;
    }

    getType() { return new ExceptionType(this); }
    getNativeTypeName(): string { return "exception" }

    toString() { return `${ExceptionKind[this.exception]}: ${this.node === undefined ? "" : this.node.toWordplay().trim()}`; }

}