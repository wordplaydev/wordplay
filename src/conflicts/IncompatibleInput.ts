import type Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '../nodes/Expression';
import type Bind from '../nodes/Bind';
import type Type from '../nodes/Type';
import type BinaryOperation from '../nodes/BinaryOperation';
import type StructureDefinition from '../nodes/StructureDefinition';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

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
        return {
            primary: {
                node: this.givenNode,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.IncompatibleInput.primary(
                        new NodeLink(this.expectedType, translation, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.IncompatibleInput.secondary(
                        new NodeLink(this.givenType, translation, context)
                    ),
            },
        };
    }
}
