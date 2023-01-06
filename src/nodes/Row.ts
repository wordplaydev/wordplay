import Node, { type Replacement } from './Node';
import Token from './Token';
import Bind from './Bind';
import Expression from './Expression';
import type Translation from '../translations/Translation';

export default class Row extends Node {
    readonly open: Token;
    readonly cells: (Bind | Expression)[];
    readonly close: Token | undefined;

    constructor(
        open: Token,
        cells: (Bind | Expression)[],
        close: Token | undefined
    ) {
        super();

        this.open = open;
        this.cells = cells;
        this.close = close;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'cells', types: [[Bind, Expression]] },
            { name: 'close', types: [Token] },
        ];
    }

    allBinds() {
        return this.cells.every((cell) => cell instanceof Bind);
    }
    allExpressions() {
        return this.cells.every((cell) => !(cell instanceof Bind));
    }

    computeConflicts() {}

    clone(replace?: Replacement) {
        return new Row(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('cells', this.cells, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Row;
    }
}
