import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locale from '@locale/Locale';
import type Concretizer from './Concretizer';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.NotImplementedType.name);
    }
}
