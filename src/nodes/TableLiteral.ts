import type Conflict from '@conflicts/Conflict';
import getConceptName from '@locale/getConceptName';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import TableValue from '@values/TableValue';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import ExtraCell from '@conflicts/ExtraCell';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import MissingCell from '@conflicts/MissingCell';
import UnexpectedColumnBind from '@conflicts/UnexpectedColumnBind';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import { tokenize } from '@parser/Tokenizer';
import StructureValue from '@values/StructureValue';
import Bind from '@nodes/Bind';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import CompositeLiteral from '@nodes/CompositeLiteral';
import type Context from '@nodes/Context';
import Expression, { type GuardContext } from '@nodes/Expression';
import Input from '@nodes/Input';
import Names from '@nodes/Names';
import type Node from '@nodes/Node';
import { list, node, type Grammar, type Replacement } from '@nodes/Node';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Row, { getRowFromValues } from '@nodes/Row';
import { Sym } from '@nodes/Sym';
import TableType from '@nodes/TableType';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import UnionType from '@nodes/UnionType';
import { isDefined } from '@util/nullable';

/** The quote pairs a CSV cell may be wrapped in. Typed as tuples so
 *  destructuring yields strings rather than `string | undefined`. */
const CellQuotes: readonly (readonly [string, string])[] = [
    ["'", "'"],
    ['"', '"'],
    ['\u201c', '\u201d'],
];

/**
 * A cell without the quotes that wrap the whole of it.
 *
 * Both ends must match, and there must be something between them: a cell that
 * merely *ends* in a quote — `and "quotes"` — is not a quoted cell, and
 * stripping one end of it silently dropped a character.
 */
function unquote(cell: string): string {
    if (cell.length < 2) return cell;
    for (const [open, close] of CellQuotes)
        if (cell.startsWith(open) && cell.endsWith(close))
            return cell.substring(1, cell.length - 1);
    return cell;
}

export default class TableLiteral extends CompositeLiteral {
    readonly type: TableType;
    readonly rows: Row[];

    constructor(type: TableType, rows: Row[]) {
        super();

        this.type = type;
        this.rows = rows;

        this.computeChildren();
    }

    static make(type?: TableType, rows?: Row[]) {
        return new TableLiteral(type ?? TableType.make(), rows ?? [Row.make()]);
    }

    static from(data: string[][]): TableLiteral | undefined {
        const header = data.shift();

        if (header === undefined) return undefined;
        const rows: Row[] = [];

        for (const row of data) {
            const cells: Expression[] = [];
            // Tokenize each row
            for (const cell of row) {
                const trimmed = unquote(cell.trim());
                const tokens = tokenize(trimmed).getTokens();
                // Strip the end of file
                tokens.pop();
                const firstToken = tokens[0];
                // Convert numbers to number literals
                if (firstToken === undefined) cells.push(NoneLiteral.make());
                else if (firstToken.isSymbol(Sym.Number))
                    cells.push(new NumberLiteral(firstToken));
                else {
                    // Classified by its tokens, but kept as it was written:
                    // rejoining the tokens with spaces turned any cell that
                    // wasn't a single token into a different string, so
                    // `likes, commas` came back as `likes , commas`.
                    const lowered = trimmed.toLowerCase();
                    if (lowered === 'true')
                        cells.push(BooleanLiteral.make(true));
                    else if (lowered === 'false')
                        cells.push(BooleanLiteral.make(false));
                    else cells.push(TextLiteral.make(trimmed));
                }
            }
            rows.push(Row.make(cells));
        }

        /** The alternatives as a right-nested union, or undefined when the
         * column offered no values to infer from. */
        function inferType(expressions: Expression[]): Type | undefined {
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
            return unionOf(types);
        }

        /** Right-nested union of the given types, or undefined when empty. */
        function unionOf(types: Type[]): Type | undefined {
            const [first, ...rest] = types;
            if (first === undefined) return undefined;
            const restUnion = unionOf(rest);
            return restUnion === undefined
                ? first
                : UnionType.make(first, restUnion);
        }

        const type = TableType.make(
            header.map((col, index) => {
                const tokens = tokenize(
                    col.replaceAll(' ', '').replaceAll('_', ''),
                ).getTokens();
                const firstToken = tokens[0];
                const name =
                    firstToken === undefined
                        ? `n${index}`
                        : firstToken.isSymbol(Sym.Name)
                          ? firstToken.getText()
                          : firstToken.isSymbol(Sym.Number)
                            ? `n${firstToken.getText()}`
                            : `n${index}`;

                return Bind.make(
                    undefined,
                    // Try to make a valid name
                    Names.make([name]),
                    inferType(
                        rows
                            .map((row) => {
                                const cell = row.cells[index];
                                return cell instanceof Input
                                    ? cell.value
                                    : cell;
                            })
                            // A row shorter than the header contributes nothing,
                            // as an undefined cell did before.
                            .filter(isDefined),
                    ),
                    undefined,
                );
            }),
        );

        return new TableLiteral(type, rows);
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [TableLiteral.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TableLiteral';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'type',
                kind: node(TableType),
                label: () => (l) => getConceptName(l, 'table'),
            },
            {
                name: 'rows',
                kind: list(true, node(Row)),
                newline: true,
                label: () => (l) => getConceptName(l, 'row'),
            },
        ];
    }

    getPurpose() {
        return Purpose.Tables;
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
                        if (
                            !context.isUnknownDownstream(cell) &&
                            !expected.accepts(given, context)
                        )
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

    getConstantLength(): number {
        return this.rows.length;
    }

    computeType(): TableType {
        return this.type;
    }

    /** TableLiterals depend on all of their cells. */
    getDependencies(): Expression[] {
        const dependencies = [];
        for (const row of this.rows)
            for (const cell of row.cells)
                dependencies.push(cell instanceof Input ? cell.value : cell);
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
                            ...(cell instanceof Input
                                ? cell.value
                                : cell
                            ).compile(evaluator, context),
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
        for (const tableRow of this.rows) {
            // Get the values, building the list in order of appearance.
            const values: Value[] = [];
            for (let c = 0; c < tableRow.cells.length; c++)
                values.unshift(evaluator.popValue(this));

            const row = getRowFromValues(evaluator, this, this.type, values);
            if (row instanceof StructureValue) rows.unshift(row);
            else return row;
        }
        return new TableValue(this, this.type, rows);
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new TableLiteral(
                this.replaceChild('type', this.type, replace),
                this.replaceChild('rows', this.rows, replace),
            ),
        );
    }

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child instanceof Row
            ? this.rows.includes(child)
                ? this.type
                : this.getParent(context)
            : undefined;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // Rows aren't Expressions, so the old `instanceof Expression` filter here
        // skipped every cell of every row.
        this.rows.forEach((row) => row.evaluateTypeGuards(current, guard));
        return current;
    }

    getStart() {
        return this.type;
    }

    getFinish() {
        return this.rows[this.rows.length - 1] ?? this.type;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TableLiteral;
    getLocalePath() {
        return TableLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.TableLiteral.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.TableLiteral.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getCharacter() {
        return Characters.Table;
    }

    getDescriptionInputs() {
        return {
            count: this.rows.length,
        };
    }
}
