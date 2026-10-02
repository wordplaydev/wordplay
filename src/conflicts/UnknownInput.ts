import type LocaleText from '#locale/LocaleText.ts';
import { toResolutions } from '#conflicts/Conflict.ts';
import Context from '#nodes/Context.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import Input from '#nodes/Input.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Locales from '#locale/Locales.ts';
import type BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import type StreamDefinition from '#nodes/StreamDefinition.ts';
import Conflict, {
    ConflictSeverity,
    type Repair,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';
import levenshtein from '#util/levenshtein.ts';

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
        return (
            toResolutions(candidates) ??
            Conflict.fallbackExplainer(this, context, concepts)
        );
    }

    getLocalePath() {
        return UnknownInput.LocalePath;
    }
}
