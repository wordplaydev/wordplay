import type Locale from '@locale/Locale';
import type Expression from './Expression';
import UnknownType from './UnknownType';
import concretize from '../locale/locales/concretize';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locale: Locale) {
        return concretize(locale, locale.node.NoExpressionType.description);
    }
}
