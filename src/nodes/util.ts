import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import InputListMustBeLast from '@conflicts/InputListMustBeLast';
import Bind from './Bind';
import type Context from './Context';
import type Node from './Node';
import type TableType from './TableType';
import type Row from './Row';
import type Conflict from '@conflicts/Conflict';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import MissingCell from '@conflicts/MissingCell';
import InvalidRow from '@conflicts/InvalidRow';
import Token from './Token';
import Symbol from './Symbol';
import DuplicateName from '@conflicts/DuplicateName';

export function requiredBindAfterOptional(
    inputs: Bind[]
): RequiredAfterOptional | undefined {
    const binds = inputs.filter((i) => i instanceof Bind) as Bind[];
    let foundOptional = false;
    let requiredAfterOptional: Bind | undefined = undefined;
    binds.forEach((bind) => {
        if (bind.value !== undefined) foundOptional = true;
        else if (
            bind.value === undefined &&
            foundOptional &&
            requiredAfterOptional === undefined
        )
            requiredAfterOptional = bind;
    });

    return inputs.length === binds.length && requiredAfterOptional !== undefined
        ? new RequiredAfterOptional(requiredAfterOptional)
        : undefined;
}

export function restIsNotLast(inputs: Bind[]) {
    const rest = inputs.find(
        (i) => i instanceof Bind && i.isVariableLength()
    ) as Bind | undefined;
    return rest !== undefined && inputs.indexOf(rest) !== inputs.length - 1
        ? new InputListMustBeLast(rest)
        : undefined;
}

export function getEvaluationInputConflicts(inputs: Bind[]) {
    const conflicts = [];

    // Distinct structure input names must be unique (but individual names are allowed to have
    // redundant names).
    for (const input of inputs) {
        const dupe = inputs.find((i) => i !== input && i.sharesName(input));
        if (dupe) {
            const sharedName = dupe.names.getSharedName(input.names);
            if (sharedName) {
                const thisName = input.names.names.find(
                    (name) => name.getName() === sharedName?.getName()
                );
                if (thisName)
                    conflicts.push(new DuplicateName(input, sharedName));
            }
        }
    }

    // Required inputs can never follow an optional one.
    const requiredAfterOptional = requiredBindAfterOptional(inputs);
    if (requiredAfterOptional) conflicts.push(requiredAfterOptional);

    // Rest arguments must be last
    const restIsntLast = restIsNotLast(inputs);
    if (restIsntLast) conflicts.push(restIsntLast);

    return conflicts;
}

export function analyzeRow(
    tableType: TableType,
    row: Row,
    context: Context
): Conflict[] {
    const conflicts: Conflict[] = [];

    // The row must "match" the columns, where match means that all columns without a default get a value.
    // Rows can either be all unnamed and provide values for every column or they can be selectively named,
    // but must provide a value for all non-default columns. No other format is allowed.
    // Additionally, all values must match their column's types.
    if (row.allBinds()) {
        // Ensure every bind is a valid column.
        const matchedColumns = [];
        for (const cell of row.cells) {
            if (cell instanceof Bind) {
                const column = tableType.getColumnNamed(cell.getNames()[0]);
                if (column === undefined)
                    conflicts.push(new UnknownColumn(tableType, cell));
                else {
                    matchedColumns.push(column);
                    const expected = column.getType(context);
                    const given = cell.getType(context);
                    if (!expected.accepts(given, context))
                        conflicts.push(
                            new IncompatibleCellType(
                                tableType,
                                cell,
                                expected,
                                given
                            )
                        );
                }
            }
        }
        // Ensure all non-default columns were specified.
        for (const column of tableType.columns) {
            if (!matchedColumns.includes(column) && !column.hasDefault())
                conflicts.push(new MissingCell(row, tableType, column));
        }

        // Ensure there are no extra expressions.
    } else if (row.allExpressions()) {
        const cells = row.cells.slice();
        for (const column of tableType.columns) {
            const cell = cells.shift();
            if (cell === undefined)
                conflicts.push(new MissingCell(row, tableType, column));
            else {
                const expected = column.getType(context);
                const given = cell.getType(context);
                if (!expected.accepts(given, context))
                    conflicts.push(
                        new IncompatibleCellType(
                            tableType,
                            cell,
                            expected,
                            given
                        )
                    );
            }
        }
    } else conflicts.push(new InvalidRow(row));

    return conflicts;
}

export function endsWithName(node: Node) {
    const tokens = node.nodes((t) => t instanceof Token) as Token[];
    return tokens.length > 0 && tokens[tokens.length - 1].isSymbol(Symbol.Name);
}

export function startsWithName(node: Node) {
    const tokens = node.nodes((t) => t instanceof Token) as Token[];
    return tokens.length > 0 && tokens[0].isSymbol(Symbol.Name);
}
