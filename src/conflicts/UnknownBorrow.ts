import type LocaleText from '@locale/LocaleText';
import type Borrow from '@nodes/Borrow';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

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
