import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Reaction from '../nodes/Reaction';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional | Reaction;
    readonly type: Type;

    constructor(conditional: Conditional | Reaction, type: Type) {
        super(false);

        this.conditional = conditional;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node:
                    this.conditional instanceof Conditional
                        ? this.conditional.question
                        : this.conditional.dots,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Conditional.conflict
                                    .ExpectedBooleanCondition.primary
                        ),
                        new NodeRef(this.type, locales, context)
                    ),
            },
            secondary: {
                node: this.conditional.condition,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Conditional.conflict
                                    .ExpectedBooleanCondition.secondary
                        ),
                        new NodeRef(this.type, locales, context)
                    ),
            },
        };
    }
}
