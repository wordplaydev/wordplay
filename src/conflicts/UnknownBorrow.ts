import type LocaleText from '#locale/LocaleText.ts';
import type Borrow from '#nodes/Borrow.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(ConflictSeverity.Error);

        this.borrow = borrow;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.UnknownBorrow;

    getMessage() {
        return {
            node:
                this.borrow.source === undefined
                    ? this.borrow.borrow
                    : this.borrow.source,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownBorrow.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the borrow statement entirely.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownBorrow.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.borrow, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnknownBorrow.LocalePath;
    }
}
