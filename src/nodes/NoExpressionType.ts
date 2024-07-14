import type Expression from './Expression';
import UnknownType from './UnknownType';
import type Locales from '../locale/Locales';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NoExpressionType.name);
    }
}
