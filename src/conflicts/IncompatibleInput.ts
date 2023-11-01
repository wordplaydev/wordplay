import Conflict from './Conflict';
import type Type from '@nodes/Type';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Node from '../nodes/Node';
import concretize from '../locale/concretize';

export default class IncompatibleInput extends Conflict {
    readonly givenNode: Node;
    readonly givenType: Type;
    readonly expectedType: Type;

    constructor(givenInput: Node, givenType: Type, expectedType: Type) {
        super(false);
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        console.error("Reached!");
        return {
            primary: {
                node: this.givenNode,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.IncompatibleInput.primary,
                        new NodeRef(
                            this.expectedType.simplify(context),
                            locale,
                            context
                        ),
                        new NodeRef(
                            this.givenType.simplify(context),
                            locale,
                            context
                        )
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.IncompatibleInput
                            .secondary,
                        new NodeRef(
                            this.expectedType.simplify(context),
                            locale,
                            context
                        ),
                        new NodeRef(
                            this.givenType.simplify(context),
                            locale,
                            context
                        )
                    ),
            },
        };
    }
}
