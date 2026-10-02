import type LocaleText from '#locale/LocaleText.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type NameType from '#nodes/NameType.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class UnexpectedTypeInput extends Conflict {
    readonly evaluate: NameType | Evaluate;
    readonly type: Type;
    readonly definition: StructureDefinition | FunctionDefinition;

    constructor(
        evaluate: NameType | Evaluate,
        type: Type,
        definition: StructureDefinition | FunctionDefinition,
    ) {
        super(ConflictSeverity.Error);
        this.evaluate = evaluate;
        this.type = type;
        this.definition = definition;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnexpectedTypeInput;

    getMessage() {
        return {
            node: this.type,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedTypeInput.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnexpectedTypeInput.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.type, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnexpectedTypeInput.LocalePath;
    }
}
