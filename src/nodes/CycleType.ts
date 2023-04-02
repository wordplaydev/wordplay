import type Node from './Node';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Translation from '@translation/Translation';
import type Context from './Context';

export class CycleType extends UnknownType<Expression> {
    readonly cycle: Node[];

    constructor(expression: Expression, cycle: Node[]) {
        super(expression, undefined);
        this.cycle = cycle;
    }

    getReason(translation: Translation, context: Context) {
        return (
            translation.node.CycleType.description(
                this,
                translation,
                context
            ) ?? ''
        );
    }
}
