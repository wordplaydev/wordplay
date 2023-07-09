import Conflict from './Conflict';
import type Type from '@nodes/Type';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
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
        return {
            primary: {
                node: this.givenNode,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.IncompatibleInput.primary,
                        new NodeLink(this.expectedType, locale, context),
                        new NodeLink(this.givenType, locale, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.IncompatibleInput.secondary,
                        new NodeLink(this.expectedType, locale, context),
                        new NodeLink(this.givenType, locale, context)
                    ),
            },
        };
    }
}
