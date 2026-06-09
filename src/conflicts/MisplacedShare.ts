import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export class MisplacedShare extends Conflict {
    readonly bind: Bind;
    readonly share: Token;
    constructor(bind: Bind, share: Token) {
        super(ConflictSeverity.Error);

        this.bind = bind;
        this.share = share;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.MisplacedShare;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MisplacedShare.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the misplaced ↑ token from the bind.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedShare.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.share, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return MisplacedShare.LocalePath;
    }
}
