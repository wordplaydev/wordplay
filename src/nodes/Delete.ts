import type Node from './Node';
import Token from './Token';
import Expression from './Expression';
import type Conflict from '@conflicts/Conflict';
import NonBooleanQuery from '@conflicts/NonBooleanQuery';
import NotATable from '@conflicts/NotATable';
import type Type from './Type';
import BooleanType from './BooleanType';
import TableType from './TableType';
import Bind from '@nodes/Bind';
import type Value from '@runtime/Value';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import UnimplementedException from '@runtime/UnimplementedException';
import type Evaluator from '@runtime/Evaluator';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';
import Glyphs from '../lore/Glyphs';

export default class Delete extends Expression {
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression;

    constructor(table: Expression, del: Token, query: Expression) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

        this.computeChildren();
    }

    getGrammar() {
        return [
            {
                name: 'table',
                types: [Expression],
                label: (translation: Translation) => translation.data.table,
            },
            { name: 'del', types: [Token] },
            {
                name: 'query',
                types: [Expression],
                label: (translation: Translation) => translation.data.query,
                // Must be a boolean
                getType: () => BooleanType.make(),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Delete(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('del', this.del, replace),
            this.replaceChild('query', this.query, replace)
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.query ? this.table : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            conflicts.push(new NotATable(this, tableType));

        // The query must be truthy.
        const queryType = this.query.getType(context);
        if (
            this.query instanceof Expression &&
            !(queryType instanceof BooleanType)
        )
            conflicts.push(new NonBooleanQuery(this, queryType));

        return conflicts;
    }

    computeType(context: Context): Type {
        // The type is identical to the table's type.
        return this.table.getType(context);
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        node;
        const type = this.table.getType(context);
        if (type instanceof TableType)
            return type.columns
                .filter((col) => col instanceof Bind)
                .map((col) => col) as Bind[];
        else return [];
    }

    getDependencies(): Expression[] {
        return [this.table, this.query];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.table.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new UnimplementedException(evaluator, this);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeSet(bind, original, current, context);
        if (this.query instanceof Expression)
            this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.del;
    }
    getFinish() {
        return this.del;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Delete;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Delete.start(
            new NodeLink(this.table, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.nodes.Delete.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Delete;
    }
}
