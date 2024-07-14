import type Type from './Type';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locales from '../locale/Locales';

export class NonFunctionType extends UnknownType<Expression> {
    constructor(expression: Expression, given: Type) {
        super(expression, given);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NonFunctionType.description);
    }
}
