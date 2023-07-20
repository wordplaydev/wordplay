import Type from './Type';
import Bind from '@nodes/Bind';
import type Context from './Context';
import Token from './Token';
import Symbol from './Symbol';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import AnyType from './AnyType';
import type Conflict from '@conflicts/Conflict';
import ExpectedColumnType from '@conflicts/ExpectedColumnType';
import { node, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';

export default class TableType extends Type {
    readonly open: Token;
    readonly columns: Bind[];
    readonly close: Token | undefined;

    constructor(open: Token, columns: Bind[], close: Token | undefined) {
        super();

        this.open = open;
        this.columns = columns;
        this.close = close;

        this.computeChildren();
    }

    static make(columns: Bind[]) {
        return new TableType(
            new Token(TABLE_OPEN_SYMBOL, [Symbol.TableOpen]),
            columns,
            new Token(TABLE_CLOSE_SYMBOL, [Symbol.TableClose])
        );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.TableOpen) },
            { name: 'columns', kind: list(node(Bind)) },
            { name: 'close', kind: node(Symbol.TableClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new TableType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('columns', this.columns, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    computeConflicts(context: Context) {
        const conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach((column) => {
            if (column.getType(context) instanceof AnyType)
                conflicts.push(new ExpectedColumnType(this, column));
        });

        return conflicts;
    }

    getColumnNamed(name: string): Bind | undefined {
        return this.columns.find((c) => c instanceof Bind && c.hasName(name));
    }

    acceptsAll(types: TypeSet, context: Context) {
        return types.list().every((type) => {
            if (!(type instanceof TableType)) return false;
            if (this.columns.length !== type.columns.length) return false;
            for (let i = 0; i < this.columns.length; i++)
                if (
                    !this.columns[i]
                        .getType(context)
                        .accepts(type.columns[i].getType(context), context)
                )
                    return false;
            return true;
        });
    }

    getNativeTypeName(): NativeTypeName {
        return 'table';
    }

    getNodeLocale(translation: Locale) {
        return translation.node.TableType;
    }

    getGlyphs() {
        return Glyphs.Table;
    }
}
