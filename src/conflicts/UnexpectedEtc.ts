import type LocaleText from '#locale/LocaleText.ts';
import type Bind from '#nodes/Bind.ts';
import type Token from '#nodes/Token.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class UnexpectedEtc extends Conflict {
    readonly etc: Token;
    readonly bind: Bind;
    constructor(etc: Token, bind: Bind) {
        super(ConflictSeverity.Error);
        this.etc = etc;
        this.bind = bind;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.UnexpectedEtc;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedEtc.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the misplaced `…` token from the bind.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnexpectedEtc.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.etc, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnexpectedEtc.LocalePath;
    }
}
