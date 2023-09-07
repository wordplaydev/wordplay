import type Node from './Node';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locale from '@locale/Locale';
import type Concretizer from './Concretizer';

export default class CycleType extends UnknownType<Expression> {
    readonly cycle: Node[];

    constructor(expression: Expression, cycle: Node[]) {
        super(expression, undefined);
        this.cycle = cycle;
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.CycleType.description);
    }
}
