import ConceptRef from '@locale/ConceptRef';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Input from '@nodes/Input';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Token from '@nodes/Token';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import type Locales from '@locale/Locales';
import type StreamDefinition from '@nodes/StreamDefinition';
import type Node from '@nodes/Node';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';

export default class MissingInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate | UnaryEvaluate;
    readonly last: Token | Expression | Input;
    readonly input: Bind;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate | UnaryEvaluate,
        last: Token | Expression | Input,
        expected: Bind,
    ) {
        super(ConflictSeverity.Error);
        this.func = func;
        this.evaluate = evaluate;
        this.last = last;
        this.input = expected;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.MissingInput;

    getMessage() {
        return {
            node: this.evaluate.fun,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => MissingInput.LocalePath(l).explanation,
                    {
                        name:
                            this.func.names.getPreferredNameString(
                                locales.getLocales(),
                            ) ??
                            this.func.names.getFirst() ??
                            '—',
                        input: context.project.contains(this.input)
                            ? new NodeRef(this.input, locales, context)
                            : new ConceptRef(
                                  `${this.func.getPreferredName(
                                      locales.getLocales(),
                                  )}/${this.input.getPreferredName(
                                      locales.getLocales(),
                                  )}`,
                              ),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return MissingInput.LocalePath;
    }
}
