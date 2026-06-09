import type LocaleText from '@locale/LocaleText';
import Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import Input from '@nodes/Input';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '@locale/Locales';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type StreamDefinition from '@nodes/StreamDefinition';
import Conflict, {
    ConflictSeverity,
    type Repair,
    type Resolutions,
} from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import levenshtein from '@util/levenshtein';

export default class UnknownInput extends Conflict {
    readonly func: FunctionDefinition | StructureDefinition | StreamDefinition;
    readonly evaluate: Evaluate | BinaryEvaluate;
    readonly given: Input;

    constructor(
        func: FunctionDefinition | StructureDefinition | StreamDefinition,
        evaluate: Evaluate | BinaryEvaluate,
        given: Input,
    ) {
        super(ConflictSeverity.Error);

        this.func = func;
        this.evaluate = evaluate;
        this.given = given;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnknownInput;

    getMessage() {
        return {
            node: this.given.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnknownInput.LocalePath(l).explanation,
                    {
                        name: this.func.getPreferredName(locales.getLocales()),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // Suggest input names in the called function's signature that are
        // within Levenshtein distance 2 of the given (typo) name.
        const givenName = this.given.getName();
        const candidates: Repair[] = [];
        for (const bind of this.func.inputs) {
            const names = bind.names.names;
            for (const name of names) {
                const text = name.getName();
                if (text === undefined || text === givenName) continue;
                if (levenshtein(givenName, text) > 2) continue;
                const replacement = Input.make(text, this.given.value);
                candidates.push({
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) => UnknownInput.LocalePath(l).resolution,
                            { name: text },
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [this.given, replacement],
                        ]),
                        newNode: replacement,
                    }),
                });
                break;
            }
        }
        if (candidates.length === 0)
            return Conflict.fallbackExplainer(this, context, concepts);
        return candidates as readonly Repair[] as Resolutions;
    }

    getLocalePath() {
        return UnknownInput.LocalePath;
    }
}
