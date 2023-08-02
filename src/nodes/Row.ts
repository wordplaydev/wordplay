import type { Grammar, Replacement } from './Node';
import type Token from './Token';
import Bind from './Bind';
import Expression from './Expression';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import Symbol from './Symbol';

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
