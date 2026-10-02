import type LocaleText from '#locale/LocaleText.ts';
import type Context from '#nodes/Context.ts';
import type Translate from '#nodes/Translate.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

/** A warning that a translate (↦) body has no `.` referring to the current item. */
export class ExpectedThis extends Conflict {
    readonly translate: Translate;

    constructor(translate: Translate) {
        super(ConflictSeverity.Minor);
        this.translate = translate;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Translate.conflict.ExpectedThis;

    getMessage() {
        return {
            node: this.translate.translation,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedThis.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return ExpectedThis.LocalePath;
    }
}
