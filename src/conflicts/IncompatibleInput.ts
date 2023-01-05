import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '../nodes/Expression';
import type Bind from '../nodes/Bind';
import type Type from '../nodes/Type';
import type BinaryOperation from '../nodes/BinaryOperation';
import type StructureDefinition from '../nodes/StructureDefinition';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type Translation from '../translations/Translation';

export default class IncompatibleInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly givenNode: Expression | Bind;
    readonly givenType: Type;
    readonly expectedType: Type;

    constructor(
        func: FunctionDefinition | StructureDefinition,
        evaluate: Evaluate | BinaryOperation,
        givenInput: Expression | Bind,
        givenType: Type,
        expectedType: Type
    ) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return { primary: this.givenNode, secondary: [this.expectedType] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleInput.primary([
            this.expectedType,
            this.givenType,
        ]);
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleInput.secondary();
    }
}
