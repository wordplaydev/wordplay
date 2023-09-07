import type Type from './Type';
import UnknownType from './UnknownType';
import type Locale from '@locale/Locale';
import type Expression from './Expression';
import type Concretizer from './Concretizer';

export class NonFunctionType extends UnknownType<Expression> {
    constructor(expression: Expression, given: Type) {
        super(expression, given);
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.NonFunctionType.description);
    }
}
