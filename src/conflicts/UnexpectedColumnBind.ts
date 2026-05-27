import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Bind from '@nodes/Bind';
import type TableLiteral from '@nodes/TableLiteral';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export default class UnexpectedColumnBind extends Conflict {
    readonly expression: TableLiteral;
    readonly cell: Bind;

    constructor(literal: TableLiteral, cell: Bind) {
        super(false);
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

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
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
