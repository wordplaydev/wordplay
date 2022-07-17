import Value from "./Value";

export enum ExceptionType {
    EXPECTED_VALUE,
    UNPARSABLE,
    NO_BLOCK_EXPRESSION,
    UNKNOWN_OPERATOR,
    INCOMPATIBLE_TYPE,
    EXCPECTED_CONTEXT,
    NOT_IMPLEMENTED,
    NO_FUNCTION_EXPRESSION,
    POSSIBLE_INFINITE_RECURSION,
    UNKNOWN_NAME
}

export default class Exception extends Value {

    readonly exception: ExceptionType;

    constructor(exception: ExceptionType) {
        super();

        this.exception = exception;
    }

    toString() { return `Exception: ${ExceptionType[this.exception]}`; }

}