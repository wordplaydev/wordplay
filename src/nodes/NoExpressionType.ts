import type Locale from '@locale/Locale';
import type Expression from './Expression';
import UnknownType from './UnknownType';
import type Concretizer from './Concretizer';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.NoExpressionType.name);
    }
}
