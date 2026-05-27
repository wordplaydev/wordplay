import type LocaleText from '@locale/LocaleText';
import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type NameType from '@nodes/NameType';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export default class UnexpectedTypeInput extends Conflict {
    readonly evaluate: NameType | Evaluate;
    readonly type: Type;
    readonly definition: StructureDefinition | FunctionDefinition;

    constructor(
        evaluate: NameType | Evaluate,
        type: Type,
        definition: StructureDefinition | FunctionDefinition,
    ) {
        super(false);
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

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
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
