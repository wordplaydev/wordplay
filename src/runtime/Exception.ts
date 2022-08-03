import ExceptionStructureType from "../native/ExceptionStructureType";
import Value from "./Value";
import type Node from "../nodes/Node";

export enum ExceptionType {
    NOT_IMPLEMENTED,
    UNPARSABLE,
    PLACEHOLDER,
    EXPECTED_TYPE,
    EXPECTED_EXPRESSION,
    EXPECTED_VALUE,
    EXPECTED_STRUCTURE,
    EXPECTED_CONTEXT,
    UNKNOWN_NAME,
    UNKNOWN_OPERATOR,
    UNKNOWN_CONVERSION,
    UNKNOWN_SHARE,
    EXISTING_SHARE,
    POSSIBLE_INFINITE_RECURSION
}

export default class Exception extends Value {

    readonly node: Node;
    readonly exception: ExceptionType;

    constructor(node: Node, exception: ExceptionType) {
        super();

        this.node = node;
        this.exception = exception;
    }

    getType() { return ExceptionStructureType; }

    toString() { return `${ExceptionType[this.exception]}: ${this.node.toWordplay().trim()}`; }

}