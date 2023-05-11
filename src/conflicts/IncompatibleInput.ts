import type Evaluate from '@nodes/Evaluate';
import Conflict from './Conflict';
import type Expression from '@nodes/Expression';
import type Bind from '@nodes/Bind';
import type Type from '@nodes/Type';
import type BinaryOperation from '@nodes/BinaryOperation';
import type StructureDefinition from '@nodes/StructureDefinition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locale from '@translation/Locale';
import NodeLink from '@translation/NodeLink';
import type Context from '@nodes/Context';
import type StreamDefinition from '../nodes/StreamDefinition';

export default class IncompatibleInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryOperation;
    readonly givenNode: Expression | Bind;
    readonly givenType: Type;
    readonly expectedType: Type;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleInput.primary(
                        new NodeLink(this.givenType, translation, context),
                        new NodeLink(this.expectedType, translation, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.IncompatibleInput.secondary(
                        new NodeLink(this.givenType, translation, context),
                        new NodeLink(this.expectedType, translation, context)
                    ),
            },
        };
    }
}
