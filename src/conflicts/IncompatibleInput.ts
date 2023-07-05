import Conflict from './Conflict';
import type Type from '@nodes/Type';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import type Context from '@nodes/Context';
import type Node from '../nodes/Node';

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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleInput.primary(
                        new NodeLink(this.givenType, translation, context),
                        new NodeLink(this.expectedType, translation, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleInput.secondary(
                        new NodeLink(this.givenType, translation, context),
                        new NodeLink(this.expectedType, translation, context)
                    ),
            },
        };
    }
}
