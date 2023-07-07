import type Source from '@nodes/Source';
import type Borrow from '@nodes/Borrow';
import type Program from '@nodes/Program';
import Conflict from './Conflict';
import type Locale from '@locale/Locale';
import type Context from '@nodes/Context';
import NodeLink from '@locale/NodeLink';
import concretize from '../locale/locales/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.BorrowCycle,
                        new NodeLink(
                            this.borrow,
                            locale,
                            context,
                            this.cycle[0].names.getLocaleText(locale.language)
                        )
                    ),
            },
        };
    }
}
