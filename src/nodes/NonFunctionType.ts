import type Type from './Type';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export class NonFunctionType extends UnknownType<Expression> {
    constructor(expression: Expression, given: Type) {
        super(expression, given);
    }

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.NonFunctionType.description)
        );
    }
}
