import type LocaleText from '#locale/LocaleText.ts';
import type Expression from '#nodes/Expression.ts';
import type Input from '#nodes/Input.ts';
import type Locales from '#locale/Locales.ts';
import type Select from '#nodes/Select.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class ExpectedSelectName extends Conflict {
    readonly select: Select;
    readonly cell: Expression | Input;

    constructor(select: Select, cell: Expression | Input) {
        super(ConflictSeverity.Error);

        this.select = select;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Select.conflict.ExpectedSelectName;

    getMessage() {
        return {
            node: this.select,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedSelectName.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the invalid cell — the learner can re-add a column reference.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedSelectName.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.cell, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedSelectName.LocalePath;
    }
}
