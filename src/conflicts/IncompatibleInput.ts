import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import type Node from '../nodes/Node';
import Conflict from './Conflict';

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
        return {
            primary: {
                node: this.givenNode,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Evaluate.conflict.IncompatibleInput.primary,
                        new NodeRef(
                            this.expectedType.simplify(context),
                            locales,
                            context,
                        ),
                        new NodeRef(
                            this.givenType.simplify(context),
                            locales,
                            context,
                        ),
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Evaluate.conflict.IncompatibleInput
                                .secondary,
                        new NodeRef(
                            this.expectedType.simplify(context),
                            locales,
                            context,
                        ),
                        new NodeRef(
                            this.givenType.simplify(context),
                            locales,
                            context,
                        ),
                    ),
            },
        };
    }
}
