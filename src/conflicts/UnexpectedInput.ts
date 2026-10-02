import type LocaleText from '#locale/LocaleText.ts';
import type BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type Input from '#nodes/Input.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Locales from '#locale/Locales.ts';
import type StreamDefinition from '#nodes/StreamDefinition.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class UnexpectedInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly input: Expression | Input;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        input: Expression | Input,
    ) {
        super(ConflictSeverity.Error);
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

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnexpectedInput.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.input, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnexpectedInput.LocalePath;
    }
}
