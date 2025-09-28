import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Evaluation, { type EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '../parser/Symbols';
import StructureValue from '../values/StructureValue';
import type Value from '../values/Value';
import ValueException from '../values/ValueException';
import Expression from './Expression';
import Input from './Input';
import type { Grammar, Replacement } from './Node';
import Node, { any, list, node } from './Node';
import Sym from './Sym';
import type TableType from './TableType';
import Token from './Token';

export default class Row extends Node {
    readonly open: Token;
    readonly cells: (Input | Expression)[];
    readonly close: Token | undefined;

    constructor(
        open: Token,
        cells: (Input | Expression)[],
        close: Token | undefined,
    ) {
        super();

        this.open = open;
        this.cells = cells;
        this.close = close;

        this.computeChildren();
    }

    static make(cells: Expression[] = []) {
        return new Row(
            new Token(TABLE_OPEN_SYMBOL, Sym.TableOpen),
            cells,
            new Token(TABLE_CLOSE_SYMBOL, Sym.TableClose),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Row';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'open',
                kind: any(
                    node(Sym.TableOpen),
                    node(Sym.Select),
                    node(Sym.Insert),
                    node(Sym.Delete),
                    node(Sym.Update),
                ),
                label: undefined,
            },
            {
                name: 'cells',
                kind: list(true, node(Input), node(Expression)),
                space: true,
                label: () => (l) => l.term.cell,
            },
            { name: 'close', kind: node(Sym.TableClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new Row(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('cells', this.cells, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Bind;
    }

    getDependencies() {
        return [...this.cells];
    }

    allExpressions() {
        return this.cells.every((cell) => !(cell instanceof Input));
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Row;
    getLocalePath() {
        return Row.LocalePath;
    }

    getCharacter() {
        return Characters.Table;
    }
}

/** A helper function for converting rows into evaluations  */
export function getRowFromValues(
    evaluator: Evaluator,
    creator: EvaluationNode,
    table: TableType,
    values: Value[],
) {
    const evaluation = new Evaluation(
        evaluator,
        creator,
        table.definition,
        evaluator.getCurrentEvaluation(),
    );

    for (let c = 0; c < table.columns.length; c++) {
        const column = table.columns[c];
        const cell = values.shift();
        if (cell instanceof ExceptionValue) return cell;
        if (cell === undefined) return new ValueException(evaluator, creator);
        evaluation.bind(column.names, cell);
    }

    // Return a new table with the new row.
    return new StructureValue(creator, evaluation);
}
