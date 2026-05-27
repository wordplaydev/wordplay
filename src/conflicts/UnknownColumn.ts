import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import type TableType from '@nodes/TableType';
import type Locales from '@locale/Locales';
import Conflict, { type Repair, type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import levenshtein from '@util/levenshtein';

export default class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Expression | Input;

    constructor(type: TableType, cell: Expression | Input) {
        super(false);
        this.type = type;
        this.cell = cell;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.UnknownColumn;

    getMessage() {
        return {
            node: this.cell,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownColumn.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        // Only suggest if this is an Input — Levenshtein-match its name
        // against the table's actual column names.
        if (!(this.cell instanceof Input))
            return Conflict.fallbackExplainer(this, context, concepts);
        const given = this.cell.getName();
        const candidates: Repair[] = [];
        for (const col of this.type.columns) {
            for (const name of col.names.names) {
                const text = name.getName();
                if (text === undefined || text === given) continue;
                if (levenshtein(given, text) > 2) continue;
                const replacement = Input.make(text, this.cell.value);
                candidates.push({
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) => UnknownColumn.LocalePath(l).resolution,
                            { name: text },
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [this.cell, replacement],
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
        return UnknownColumn.LocalePath;
    }
}
