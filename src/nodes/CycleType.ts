import type Node from './Node';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locale from '@locale/Locale';
import type Context from './Context';

export class CycleType extends UnknownType<Expression> {
    readonly cycle: Node[];

    constructor(expression: Expression, cycle: Node[]) {
        super(expression, undefined);
        this.cycle = cycle;
    }

    getReason(translation: Locale, context: Context) {
        return (
            translation.node.CycleType.description(
                this,
                translation,
                context
            ) ?? ''
        );
    }
}
