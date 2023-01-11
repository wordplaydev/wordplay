import type { NativeTypeName } from '../native/NativeConstants';
import type Exception from '../runtime/Exception';
import type Translation from '../translations/Translation';
import Type from './Type';
import type TypeSet from './TypeSet';

export default class ExceptionType extends Type {
    readonly exception: Exception;

    constructor(exception: Exception) {
        super();

        this.exception = exception;
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {}
    acceptsAll(types: TypeSet): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof ExceptionType &&
                    this.exception.constructor === type.exception.constructor
            );
    }

    getConversion() {
        return undefined;
    }

    getNativeTypeName(): NativeTypeName {
        return 'exception';
    }

    toWordplay(): string {
        return this.exception.toString();
    }

    clone() {
        return new ExceptionType(this.exception) as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.ExceptionType;
    }
}
