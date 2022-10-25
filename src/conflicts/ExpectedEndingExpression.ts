import type Block from "../nodes/Block";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class ExpectedEndingExpression extends Conflict {

    readonly block: Block;

    constructor(block: Block) {
        super(false);
        this.block = block;
    }

    getConflictingNodes() {
        return { primary: [ this.block.statements.length === 0 ? this.block : this.block.statements[this.block.statements.length - 1] ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `Every block must end with an expression.`,
            "😀": `${TRANSLATE} …?`
        }
    }

}