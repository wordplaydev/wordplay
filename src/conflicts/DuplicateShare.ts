import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
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

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
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
