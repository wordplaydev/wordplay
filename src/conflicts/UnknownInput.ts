import type LocaleText from '@locale/LocaleText';
import Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Input from '@nodes/Input';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import type BinaryEvaluate from '../nodes/BinaryEvaluate';
import type StreamDefinition from '../nodes/StreamDefinition';
import Conflict from './Conflict';

export default class UnknownInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly given: Input;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        given: Input,
    ) {
        super(false);

        this.func = func;
        this.evaluate = evaluate;
        this.given = given;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnknownInput;

    getConflictingNodes() {
        return {
            primary: {
                node: this.given.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnknownInput.LocalePath(l).primary,
                        this.func.getPreferredName(locales.getLocales()),
                    ),
            },
            secondary: {
                node: this.func.names,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownInput.LocalePath(l).secondary,
                        this.given.name.getText(),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownInput.LocalePath;
    }
}
