import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Translate from '#nodes/Translate.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

/** The left side of a translate (↦) must be a List, Set, Map, or Table. */
export class ExpectedCollection extends Conflict {
    readonly translate: Translate;
    readonly givenType: Type;

    constructor(translate: Translate, givenType: Type) {
        super(ConflictSeverity.Error);
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
