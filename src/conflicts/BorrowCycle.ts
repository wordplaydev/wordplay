import type Source from '@nodes/Source';
import type Borrow from '@nodes/Borrow';
import type Program from '@nodes/Program';
import Conflict from './Conflict';
import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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

    getConflictingNodes() {
        return {
            primary: {
                node: this.borrow,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get((l) => l.node.Borrow.conflict.BorrowCycle),
                        new NodeRef(
                            this.borrow,
                            locales,
                            context,
                            locales.getName(this.cycle[0].names)
                        )
                    ),
            },
        };
    }
}
