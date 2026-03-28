import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import type Node from '../nodes/Node';
import Conflict from './Conflict';
import { makeConversionResolutions } from './ConversionResolutions';

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

    getMessage(context: Context, _concepts: Node[]) {
        const resolutions =
            this.givenNode instanceof Expression
                ? makeConversionResolutions(
                      this.givenNode,
                      this.givenType,
                      this.expectedType,
                      context,
                      (l) => IncompatibleInput.LocalePath(l).resolution,
                  )
                : [];

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
            resolutions,
        };
    }

    getLocalePath() {
        return IncompatibleInput.LocalePath;
    }
}
