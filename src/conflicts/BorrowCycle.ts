import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Program from '@nodes/Program';
import type Source from '@nodes/Source';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export class BorrowCycle extends Conflict {
    readonly program: Program;
    readonly borrow: Borrow;
    readonly cycle: Source[];

    constructor(program: Program, borrow: Borrow, cycle: Source[]) {
        super(false);
        this.program = program;
        this.borrow = borrow;
        this.cycle = cycle;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Borrow.conflict.BorrowCycle;

    getMessage() {
        return {
            node: this.borrow,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => BorrowCycle.LocalePath(l).explanation,
                    {
                        borrow: new NodeRef(
                        this.borrow,
                        locales,
                        context,
                        locales.getName(this.cycle[0].names),
                    ),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Break the borrow cycle by removing the offending borrow. The
        // learner can re-add it after restructuring shared definitions.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => BorrowCycle.LocalePath(l).resolution,
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
        return BorrowCycle.LocalePath;
    }
}
