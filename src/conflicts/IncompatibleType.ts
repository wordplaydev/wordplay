import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Node from '../nodes/Node';
import type Locales from '../locale/Locales';

export default class IncompatibleType extends Conflict {
    readonly receiver: Node;
    readonly expectedType: Type;
    readonly expression: Expression;
    readonly givenType: Type;

    constructor(
        receiver: Node,
        expectedType: Type,
        expression: Expression,
        givenType: Type
    ) {
        super(false);

        this.receiver = receiver;
        this.expectedType = expectedType;
        this.expression = expression;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.receiver,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Bind.conflict.IncompatibleType.primary
                        ),
                        new NodeRef(this.givenType, locales, context),
                        new NodeRef(this.expectedType, locales, context)
                    ),
            },
            secondary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Bind.conflict.IncompatibleType.secondary
                        ),
                        new NodeRef(this.givenType, locales, context),
                        new NodeRef(this.expectedType, locales, context)
                    ),
            },
        };
    }
}
