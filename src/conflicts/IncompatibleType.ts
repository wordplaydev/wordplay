import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Node from '../nodes/Node';

export default class IncompatibleType extends Conflict {
    readonly receiver: Node;
    readonly expectedType: Type;
    readonly value: Expression;
    readonly givenType: Type;

    constructor(
        receiver: Node,
        expectedType: Type,
        value: Expression,
        givenType: Type
    ) {
        super(false);

        this.receiver = receiver;
        this.expectedType = expectedType;
        this.value = value;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.receiver,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.IncompatibleType.primary,
                        new NodeRef(this.givenType, locale, context),
                        new NodeRef(this.expectedType, locale, context)
                    ),
            },
            secondary: {
                node: this.value,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.IncompatibleType.secondary,
                        new NodeRef(this.givenType, locale, context),
                        new NodeRef(this.expectedType, locale, context)
                    ),
            },
        };
    }
}
