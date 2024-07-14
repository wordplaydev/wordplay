import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locales from '../locale/Locales';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NotImplementedType.name);
    }
}
