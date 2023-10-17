import type Node from './Node';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export default class CycleType extends UnknownType<Expression> {
    readonly cycle: Node[];

    constructor(expression: Expression, cycle: Node[]) {
        super(expression, undefined);
        this.cycle = cycle;
    }

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.CycleType.description)
        );
    }
}
