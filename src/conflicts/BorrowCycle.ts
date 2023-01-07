import type Source from '../nodes/Source';
import type Borrow from '../nodes/Borrow';
import type Program from '../nodes/Program';
import Conflict from './Conflict';
import type Translation from '../translations/Translation';
import type Context from '../nodes/Context';
import NodeLink from '../translations/NodeLink';

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
        return { primary: this.borrow, secondary: [this.borrow] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.BorrowCycle.primary(
            new NodeLink(
                this.borrow,
                translation,
                context,
                this.cycle[0].names.getTranslation(translation.language)
            )
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
