import type Source from '@nodes/Source';
import type Borrow from '@nodes/Borrow';
import type Program from '@nodes/Program';
import Conflict from './Conflict';
import type Locale from '@translation/Locale';
import type Context from '@nodes/Context';
import NodeLink from '@translation/NodeLink';

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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.BorrowCycle.primary(
                        new NodeLink(
                            this.borrow,
                            translation,
                            context,
                            this.cycle[0].names.getLocaleText(
                                translation.language
                            )
                        )
                    ),
            },
        };
    }
}
