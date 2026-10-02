import type LocaleText from '#locale/LocaleText.ts';
import type Locales from '#locale/Locales.ts';
import type Bind from '#nodes/Bind.ts';
import type TableLiteral from '#nodes/TableLiteral.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class UnexpectedColumnBind extends Conflict {
    readonly expression: TableLiteral;
    readonly cell: Bind;

    constructor(literal: TableLiteral, cell: Bind) {
        super(ConflictSeverity.Error);
        this.expression = literal;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.UnexpectedColumnBind;

    getMessage() {
        return {
            node: this.expression,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedColumnBind.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Replace the bind cell with just its value side.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnexpectedColumnBind.LocalePath(l).explanation,
                    ),
                mediator: (ctx) => {
                    const value = this.cell.value;
                    return value === undefined
                        ? {
                              newProject: ctx.project.withRevisedNodes([
                                  [this.cell, undefined],
                              ]),
                          }
                        : {
                              newProject: ctx.project.withRevisedNodes([
                                  [this.cell, value],
                              ]),
                              newNode: value,
                          };
                },
            },
        ];
    }

    getLocalePath() {
        return UnexpectedColumnBind.LocalePath;
    }
}
