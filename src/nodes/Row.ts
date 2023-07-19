import type { Replacement } from './Node';
import type Token from './Token';
import Bind from './Bind';
import Expression from './Expression';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node from './Node';
import TokenType from './TokenType';

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
            { name: 'open', types: [TokenType.TableOpen] },
            { name: 'cells', types: [[Bind, Expression]] },
            { name: 'close', types: [TokenType.TableClose] },
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
