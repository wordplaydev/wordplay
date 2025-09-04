import type Locales from '../locale/Locales';
import type Expression from './Expression';
import UnknownType from './UnknownType';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NoExpressionType.name);
    }
}
