import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locale: Locale) {
        return concretize(locale, locale.node.NotImplementedType.description);
    }
}
