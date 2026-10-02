import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import type Node from '#nodes/Node.ts';
import UnknownType from '#nodes/UnknownType.ts';

export default class CycleType extends UnknownType<Expression> {
    readonly cycle: Node[];

    constructor(expression: Expression, cycle: Node[]) {
        super(expression, undefined);
        this.cycle = cycle;
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.CycleType.description);
    }
}
