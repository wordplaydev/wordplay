import Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '../nodes/Expression';
import type Bind from '../nodes/Bind';
import type BinaryOperation from '../nodes/BinaryOperation';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type StructureDefinition from '../nodes/StructureDefinition';
import type FunctionDefinition from '../nodes/FunctionDefinition';

export default class UnexpectedInputs extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly inputs: (Expression | Bind)[];

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate | BinaryOperation,
        inputs: (Expression | Bind)[]
    ) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.inputs = inputs;
    }

    getConflictingNodes() {
        return {
            primary:
                this.evaluate instanceof Evaluate
                    ? this.evaluate.func
                    : this.evaluate.operator,
            secondary: this.inputs,
        };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `This evaluation of ${
                this.evaluate instanceof Evaluate
                    ? this.evaluate.func.toWordplay()
                    : this.evaluate.operator.toWordplay()
            } has too many inputs.`,
        };
    }
}
