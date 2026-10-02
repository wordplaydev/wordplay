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

export default class UnusedBind extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(ConflictSeverity.Minor);

        this.bind = bind;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.UnusedBind;

    getMessage() {
        return {
            node: this.bind.names,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnusedBind.LocalePath(l).explanation,
                    {
                        name: new NodeRef(this.bind.names, locales, context),
                    },
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Delete the unused bind entirely.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnusedBind.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.bind, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnusedBind.LocalePath;
    }
}
