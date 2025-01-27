import type { BasisTypeName } from '../basis/BasisConstants';
import type ExceptionValue from '@values/ExceptionValue';
import Type from './Type';
import type TypeSet from './TypeSet';
import { EXCEPTION_SYMBOL } from '../parser/Symbols';
import Characters from '../lore/BasisCharacters';
import type Locales from '../locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class ExceptionType extends Type {
    readonly exception: ExceptionValue;

    constructor(exception: ExceptionValue) {
        super();

        this.exception = exception;
    }

    getDescriptor(): NodeDescriptor {
        return 'ExceptionType';
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof ExceptionType &&
                    this.exception.constructor === type.exception.constructor,
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ExceptionType);
    }

    getCharacter() {
        return Characters.Exception;
    }
}
