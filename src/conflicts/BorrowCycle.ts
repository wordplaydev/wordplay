import type Source from "../models/Source";
import type Borrow from "../nodes/Borrow";
import type Program from "../nodes/Program";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations";
import Conflict from "./Conflict";

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
        return { primary: [ this.borrow ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This borrow depends on ${this.cycle[0].name}${this.cycle.slice(1).map(source => `, which depends on ${source.name}`).join("")}, which depends on ${this.cycle[0].name}.`
        }
    }

}
