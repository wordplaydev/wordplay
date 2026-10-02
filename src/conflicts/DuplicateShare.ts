import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Bind from '#nodes/Bind.ts';
import type Context from '#nodes/Context.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(ConflictSeverity.Error);
        this.share = share;
        this.other = other;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.DuplicateShare;

    getMessage() {
        return {
            node: this.share.names,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => DuplicateShare.LocalePath(l).explanation,
                    {
                        duplicate: new NodeRef(this.other, locales, context),
                    },
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => DuplicateShare.LocalePath(l).resolution,
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
        return DuplicateShare.LocalePath;
    }
}
