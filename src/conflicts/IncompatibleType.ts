import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import type Node from '../nodes/Node';
import Conflict from './Conflict';
import { makeConversionResolutions } from './ConversionResolutions';

export default class IncompatibleType extends Conflict {
    readonly receiver: Node;
    readonly expectedType: Type;
    readonly expression: Expression;
    readonly givenType: Type;

    constructor(
        receiver: Node,
        expectedType: Type,
        expression: Expression,
        givenType: Type,
    ) {
        super(false);

        this.receiver = receiver;
        this.expectedType = expectedType;
        this.expression = expression;
        this.givenType = givenType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.IncompatibleType;

    getMessage(context: Context, _concepts: Node[]) {
        return {
            node: this.receiver,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => IncompatibleType.LocalePath(l).explanation,
                    new NodeRef(this.givenType, locales, context),
                    new NodeRef(this.expectedType, locales, context),
                ),
            resolutions: makeConversionResolutions(
                this.expression,
                this.givenType,
                this.expectedType,
                context,
                (l) => IncompatibleType.LocalePath(l).resolution,
            ),
        };
    }

    getLocalePath() {
        return IncompatibleType.LocalePath;
    }
}
