import type Conflict from '#conflicts/Conflict.ts';
import ExpectedColumnType from '#conflicts/ExpectedColumnType.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Bind from '#nodes/Bind.ts';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import AnyType from '#nodes/AnyType.ts';
import BasisType from '#nodes/BasisType.ts';
import type Context from '#nodes/Context.ts';
import type Definition from '#nodes/Definition.ts';
import Names from '#nodes/Names.ts';
import { list, node, type Grammar, type Replacement } from '#nodes/Node.ts';
import type Reference from '#nodes/Reference.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import StructureType from '#nodes/StructureType.ts';
import { Sym } from '#nodes/Sym.ts';
import TableLiteral from '#nodes/TableLiteral.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class TableType extends BasisType {
    readonly open: Token;
    readonly columns: Bind[];
    readonly close: Token | undefined;

    /** The structure definition that defines each row's data, derived from the table type. */
    readonly definition: StructureDefinition;

    constructor(open: Token, columns: Bind[], close: Token | undefined) {
        super();

        this.open = open;
        this.columns = columns;
        this.close = close;

        this.definition = this.getStructureDefinition();

        this.computeChildren();
    }

    static make(columns: Bind[] = []) {
        return new TableType(
            new Token(TABLE_OPEN_SYMBOL, [Sym.TableOpen]),
            columns,
            new Token(TABLE_CLOSE_SYMBOL, [Sym.TableClose]),
        );
    }

    static getPossibleReplacements() {
        return [TableType.make()];
    }

    static getPossibleInsertions() {
        return [TableType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TableType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TableOpen), label: undefined },
            {
                name: 'columns',
                kind: list(true, node(Bind)),
                label: () => (l) => l.glossary.column.word,
                space: true,
            },
            { name: 'close', kind: node(Sym.TableClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new TableType(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('columns', this.columns, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
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

    getDefinitions(): Definition[] {
        return this.columns;
    }

    getStructureDefinition() {
        return StructureDefinition.make(
            undefined,
            Names.make([]),
            [],
            undefined,
            this.columns,
            undefined,
        );
    }

    withColumns(references: Reference[]) {
        return TableType.make(
            references
                .map((ref) =>
                    this.columns.find((bind) => bind.hasName(ref.getName())),
                )
                .filter((bind): bind is Bind => bind !== undefined),
        );
    }

    getColumnNamed(name: string): Bind | undefined {
        return this.columns.find((c) => c instanceof Bind && c.hasName(name));
    }

    acceptsAll(types: TypeSet, context: Context) {
        return types.list().every((type) => {
            if (!(type instanceof TableType)) return false;
            if (this.columns.length === 0) return true;
            if (this.columns.length !== type.columns.length) return false;
            for (let i = 0; i < this.columns.length; i++) {
                const mine = this.columns[i];
                const theirs = type.columns[i];
                // A table type built mid-edit can hold an undefined column, and indexing it
                // threw — crashing the very menu that was offering to complete the table.
                if (mine === undefined || theirs === undefined) return false;
                if (
                    !mine
                        .getType(context)
                        .accepts(theirs.getType(context), context)
                )
                    return false;
            }
            return true;
        });
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const listDef = context.getBasis().getSimpleDefinition('table');
        return listDef.types !== undefined &&
            listDef.types.hasVariableNamed(name)
            ? new StructureType(this.definition)
            : undefined;
    }

    getBasisTypeName(): BasisTypeName {
        return 'table';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TableType;
    getLocalePath() {
        return TableType.LocalePath;
    }

    getCharacter() {
        return Characters.Table;
    }

    getDefaultExpression() {
        return TableLiteral.make();
    }
}
