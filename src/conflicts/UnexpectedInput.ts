import type LocaleText from '@locale/LocaleText';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Input from '@nodes/Input';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import type StreamDefinition from '../nodes/StreamDefinition';
import Conflict from './Conflict';

export default class UnexpectedInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly input: Expression | Input;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        input: Expression | Input,
    ) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
        this.input = input;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnexpectedInput;

    getMessage() {
        return {
            node: this.input,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedInput.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return UnexpectedInput.LocalePath;
    }
}
