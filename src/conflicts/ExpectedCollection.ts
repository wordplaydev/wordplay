import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Translate from '@nodes/Translate';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

/** The left side of a translate (↦) must be a List, Set, Map, or Table. */
export class ExpectedCollection extends Conflict {
    readonly translate: Translate;
    readonly givenType: Type;

    constructor(translate: Translate, givenType: Type) {
        super(false);
        this.translate = translate;
        this.givenType = givenType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Translate.conflict.ExpectedCollection;

    getMessage() {
        return {
            node: this.translate.expression,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ExpectedCollection.LocalePath(l).explanation,
                    {
                        type: new NodeRef(this.givenType, locales, context),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return ExpectedCollection.LocalePath;
    }
}
