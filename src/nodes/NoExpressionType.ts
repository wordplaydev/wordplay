import type Expression from './Expression';
import UnknownType from './UnknownType';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.NoExpressionType.name)
        );
    }
}
