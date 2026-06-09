import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Node from '@nodes/Node';

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
