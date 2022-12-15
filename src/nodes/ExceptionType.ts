import { EXCEPTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Exception from "../runtime/Exception";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";
import type TypeSet from "./TypeSet";

export default class ExceptionType extends Type {

    readonly exception: Exception;

    constructor(exception: Exception) {
        super();

        this.exception = exception;

    }

    getGrammar() { return []; }

    computeConflicts() {}
    acceptsAll(types: TypeSet): boolean {
        return types.list().every(type => type instanceof ExceptionType && this.exception.constructor === type.exception.constructor);
    }

    getConversion() {
        return undefined;
    }

    getNativeTypeName(): string { return EXCEPTION_NATIVE_TYPE_NAME; }

    toWordplay(): string {
        return this.exception.toString();
    }

    replace() { return new ExceptionType(this.exception) as this; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "An exception"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

}