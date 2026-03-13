import type LocaleText from '@locale/LocaleText';
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

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.IncompatibleInput;

    getMessage() {
        return {
            node: this.givenNode,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => IncompatibleInput.LocalePath(l).explanation,
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
        };
    }

    getLocalePath() {
        return IncompatibleInput.LocalePath;
    }
}
