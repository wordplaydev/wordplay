import Row, { getRowFromValues } from './Row';
import type Conflict from '@conflicts/Conflict';
import Expression, { type GuardContext } from './Expression';
import TableType from './TableType';
import Bind from './Bind';
import type Node from './Node';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import TableValue from '@values/TableValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, list } from './Node';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import StructureValue from '../values/StructureValue';
import MissingCell from '../conflicts/MissingCell';
import IncompatibleCellType from '../conflicts/IncompatibleCellType';
import ExtraCell from '../conflicts/ExtraCell';
import UnexpectedColumnBind from '../conflicts/UnexpectedColumnBind';
import type Type from './Type';
import type Locales from '../locale/Locales';
import Names from './Names';
import { tokenize } from '../parser/Tokenizer';
import Sym from './Sym';
import NumberLiteral from './NumberLiteral';
import TextLiteral from './TextLiteral';
import BooleanLiteral from './BooleanLiteral';
import UnionType from './UnionType';
import NumberType from './NumberType';
import TextType from './TextType';
import BooleanType from './BooleanType';
import NoneLiteral from './NoneLiteral';
import NoneType from './NoneType';

export default class TableLiteral extends Expression {
    readonly type: TableType;
    readonly rows: Row[];

    constructor(type: TableType, rows: Row[]) {
        super();

        this.type = type;
        this.rows = rows;

        this.computeChildren();
    }

    static make() {
        return new TableLiteral(TableType.make(), [Row.make()]);
    }

    static from(data: string[][]): TableLiteral | undefined {
        const header = data.shift();

        if (header === undefined) return undefined;
        const rows: Row[] = [];

        for (const row of data) {
            const cells: Expression[] = [];
            // Tokenize each row
            for (const cell of row) {
                let trimmed = cell.trim();
                if (
                    trimmed.startsWith("'") ||
                    trimmed.startsWith('"') ||
                    trimmed.startsWith('“') ||
                    trimmed.startsWith('”')
                )
                    trimmed = trimmed.substring(1);
                if (
                    trimmed.endsWith("'") ||
                    trimmed.endsWith('"') ||
                    trimmed.endsWith('“') ||
                    trimmed.endsWith('”')
                )
                    trimmed = trimmed.substring(0, trimmed.length - 1);
                const tokens = tokenize(trimmed).getTokens();
                // Strip the end of file
                tokens.pop();
                // Convert numbers to number literals
                if (tokens.length === 0) cells.push(NoneLiteral.make());
                else if (tokens[0].isSymbol(Sym.Number))
                    cells.push(new NumberLiteral(tokens[0]));
                else {
                    // Combine all of the tokens
                    const text = tokens
                        .map((token) => token.getText())
                        .join(' ')
                        .trim();
                    if (text.toLowerCase() === 'true')
                        cells.push(BooleanLiteral.make(true));
                    else if (text.toLowerCase() === 'false')
                        cells.push(BooleanLiteral.make(true));
                    else cells.push(TextLiteral.make(text));
                }
            }
            rows.push(Row.make(cells));
        }

        function inferType(expressions: Expression[]): Type {
            const types = [
                ...(expressions.some((expr) => expr instanceof NumberLiteral)
                    ? [NumberType.make()]
                    : []),
                ...(expressions.some((expr) => expr instanceof TextLiteral)
                    ? [TextType.make()]
                    : []),
                ...(expressions.some((expr) => expr instanceof BooleanLiteral)
                    ? [BooleanType.make()]
                    : []),
                ...(expressions.some((expr) => expr instanceof NoneLiteral)
                    ? [NoneType.make()]
                    : []),
            ];
            if (types.length === 1) return types[0];
            else if (types.length === 2)
                return UnionType.make(types[0], types[1]);
            else if (types.length === 3)
                return UnionType.make(
                    types[0],
                    UnionType.make(types[1], types[2]),
                );
            else
                return UnionType.make(
                    types[0],
                    UnionType.make(
                        types[1],
                        UnionType.make(types[2], types[3]),
                    ),
                );
        }

        const type = TableType.make(
            header.map((col, index) => {
                const tokens = tokenize(col.replaceAll(' ', '')).getTokens();
                const name = tokens[0].isSymbol(Sym.Name)
                    ? tokens[0].getText()
                    : tokens[0].isSymbol(Sym.Number)
                      ? `n${tokens[0].getText()}`
                      : `n${index}`;

                return Bind.make(
                    undefined,
                    // Try to make a valid name
                    Names.make([name]),
                    inferType(rows.map((row) => row.cells[index])),
                    undefined,
                );
            }),
        );

        return new TableLiteral(type, rows);
    }

    getDescriptor() {
        return 'TableLiteral';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'type',
                kind: node(TableType),
                label: (locales: Locales) => locales.get((l) => l.term.table),
            },
            { name: 'rows', kind: list(true, node(Row)), newline: true },
        ];
    }

    static getPossibleNodes(
        type: Type | undefined,
        anchor: Node,
        selected: boolean,
    ) {
        return type === undefined && !selected ? [TableLiteral.make()] : [];
    }

    getPurpose() {
        return Purpose.Value;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Validate each row.
        const type = this.getType(context);
        if (type instanceof TableType) {
            for (const row of this.rows) {
                // Copy the cells
                const cells = row.cells.slice();
                for (const column of type.columns) {
                    const cell = cells.shift();
                    // No cell?
                    if (cell === undefined)
                        conflicts.push(new MissingCell(row, type, column));
                    // Unexpected bind?
                    else if (cell instanceof Bind)
                        conflicts.push(new UnexpectedColumnBind(this, cell));
                    // Incompatible cell?
                    else {
                        const expected = column.getType(context);
                        const given = cell.getType(context);
                        if (!expected.accepts(given, context))
                            conflicts.push(
                                new IncompatibleCellType(
                                    type,
                                    cell,
                                    expected,
                                    given,
                                ),
                            );
                    }
                }
                // Extra cells?
                for (const extra of cells)
                    conflicts.push(new ExtraCell(extra, type));
            }
        }

        return conflicts;
    }

    computeType(): TableType {
        return this.type;
    }

    /** TableLiterals depend on all of their cells. */
    getDependencies(): Expression[] {
        const dependencies = [];
        for (const row of this.rows)
            for (const cell of row.cells) dependencies.push(cell);
        return dependencies;
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            // Compile all of the rows' cell expressions.
            ...this.rows.reduce(
                (steps: Step[], row) => [
                    ...steps,
                    ...row.cells.reduce(
                        (cells: Step[], cell) => [
                            ...cells,
                            ...cell.compile(evaluator, context),
                        ],
                        [],
                    ),
                ],
                [],
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const rows: StructureValue[] = [];
        for (let r = 0; r < this.rows.length; r++) {
            // Get the values, building the list in order of appearance.
            const values: Value[] = [];
            for (let c = 0; c < this.rows[r].cells.length; c++)
                values.unshift(evaluator.popValue(this));

            const row = getRowFromValues(evaluator, this, this.type, values);
            if (row instanceof StructureValue) rows.unshift(row);
            else return row;
        }
        return new TableValue(this, this.type, rows);
    }

    clone(replace?: Replacement) {
        return new TableLiteral(
            this.replaceChild('type', this.type, replace),
            this.replaceChild('rows', this.rows, replace),
        ) as this;
    }

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return this.rows.includes(child as Row)
            ? this.type
            : this.getParent(context);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.rows.forEach((row) => {
            if (row instanceof Expression)
                row.evaluateTypeGuards(current, guard);
        });
        return current;
    }

    getStart() {
        return this.type;
    }

    getFinish() {
        return this.rows[this.rows.length - 1] ?? this.type;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.TableLiteral);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.TableLiteral.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.TableLiteral.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Table;
    }

    getDescriptionInputs() {
        return [this.rows.length];
    }
}
