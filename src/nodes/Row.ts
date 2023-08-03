import type { Grammar, Replacement } from './Node';
import type Token from './Token';
import Bind from './Bind';
import Expression from './Expression';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import Symbol from './Symbol';
import Evaluation, { type EvaluationNode } from '../runtime/Evaluation';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import type TableType from './TableType';
import Exception from '../runtime/Exception';
import ValueException from '../runtime/ValueException';
import Structure from '../runtime/Structure';

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

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.TableOpen) },
            { name: 'cells', kind: list(node(Expression)), space: true },
            { name: 'close', kind: node(Symbol.TableClose), space: true },
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

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.Row;
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
        if (cell instanceof Exception) return cell;
        if (cell === undefined) return new ValueException(evaluator, creator);
        evaluation.bind(column.names, cell);
    }

    // Return a new table with the new row.
    return new Structure(creator, evaluation);
}
