import type { BasisTypeName } from '../basis/BasisConstants';
import type Exception from '@runtime/Exception';
import type Locale from '@locale/Locale';
import Type from './Type';
import type TypeSet from './TypeSet';
import { EXCEPTION_SYMBOL } from '../parser/Symbols';
import Glyphs from '../lore/Glyphs';

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

    getBasisTypeName(): BasisTypeName {
        return 'exception';
    }

    toWordplay(): string {
        return EXCEPTION_SYMBOL;
    }

    clone() {
        return new ExceptionType(this.exception) as this;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ExceptionType;
    }

    getGlyphs() {
        return Glyphs.Exception;
    }
}
