import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type Language from '@nodes/Language';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';

/** A region in a locale tag that names no ISO 3166 region, by code or by name.
 *  Regions went unvalidated until names made them guessable, and a misspelled
 *  name that silently means nothing is exactly what naming should not cost. */
export default class UnknownRegion extends Conflict {
    readonly language: Language;
    readonly code: Token;

    constructor(language: Language, code: Token) {
        super(ConflictSeverity.Minor);
        this.language = language;
        this.code = code;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Language.conflict.UnknownRegion;

    getMessage() {
        return {
            node: this.language,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownRegion.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownRegion.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => {
                    const removals: [Node, Node | undefined][] = [
                        [this.code, undefined],
                    ];
                    // Removing the only region leaves a dangling `-`, so the
                    // dash goes with it.
                    const dash = this.language.dash;
                    if (
                        dash !== undefined &&
                        this.code === this.language.region &&
                        this.language.regionExtras.length === 0
                    )
                        removals.push([dash, undefined]);
                    return {
                        newProject: ctx.project.withRevisedNodes(removals),
                    };
                },
            },
        ];
    }

    getLocalePath() {
        return UnknownRegion.LocalePath;
    }
}
