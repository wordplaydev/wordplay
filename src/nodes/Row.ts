import type { Grammar, Replacement } from './Node';
import Token from './Token';
import Bind from './Bind';
import Expression from './Expression';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { any, list, node } from './Node';
import Sym from './Sym';
import Evaluation, { type EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type TableType from './TableType';
import ExceptionValue from '@values/ExceptionValue';
import ValueException from '../values/ValueException';
import StructureValue from '../values/StructureValue';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '../parser/Symbols';
import type Locales from '../locale/Locales';

export default class Row extends Node {
    readonly open: Token;
    readonly cells: Expression[];
    readonly close: Token | undefined;

    constructor(open: Token, cells: Expression[], close: Token | undefined) {
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
            new Token(TABLE_CLOSE_SYMBOL, Sym.TableClose)
        );
    }

    getDescriptor() {
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
                    node(Sym.Update)
                ),
            },
            { name: 'cells', kind: list(true, node(Expression)), space: true },
            { name: 'close', kind: node(Sym.TableClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new Row(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('cells', this.cells, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Bind;
    }

    allBinds() {
        return this.cells.every((cell) => cell instanceof Bind);
    }

    allExpressions() {
        return this.cells.every((cell) => !(cell instanceof Bind));
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Row);
    }

    getGlyphs() {
        return Glyphs.Table;
    }
}

/** A helper function for converting rows into evaluations  */
export function getRowFromValues(
    evaluator: Evaluator,
    creator: EvaluationNode,
    table: TableType,
    values: Value[]
) {
    const evaluation = new Evaluation(
        evaluator,
        creator,
        table.definition,
        evaluator.getCurrentEvaluation()
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
