import { Purpose } from '#concepts/Purpose.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type ExceptionValue from '#values/ExceptionValue.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import { EXCEPTION_SYMBOL } from '#parser/Symbols.ts';
import Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class ExceptionType extends Type {
    readonly exception: ExceptionValue;

    constructor(exception: ExceptionValue) {
        super();

        this.exception = exception;
    }

    getDescriptor(): NodeDescriptor {
        return 'ExceptionType';
    }

    getPurpose() {
        return Purpose.Hidden;
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
        return this.cloned(new ExceptionType(this.exception));
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ExceptionType;
    getLocalePath() {
        return ExceptionType.LocalePath;
    }

    getCharacter() {
        return Characters.Exception;
    }
}
