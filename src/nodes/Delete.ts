import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Bind from '@nodes/Bind';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import BoolValue from '@values/BoolValue';
import type Value from '@values/Value';
import { getIteration, getIterationResult } from '../basis/Iteration';
import Purpose from '../concepts/Purpose';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { DELETE_SYMBOL } from '../parser/Symbols';
import type StructureValue from '../values/StructureValue';
import TableValue from '../values/TableValue';
import BooleanType from './BooleanType';
import type Context from './Context';
import type Definition from './Definition';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import type Node from './Node';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import TableType from './TableType';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

type DeleteState = { index: number; list: StructureValue[]; table: TableValue };

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

    static make(table: Expression, query: Expression) {
        return new Delete(table, new Token(DELETE_SYMBOL, Sym.Delete), query);
    }

    getDescriptor(): NodeDescriptor {
        return 'Delete';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: () => (l) => l.term.table,
            },
            { name: 'del', kind: node(Sym.Delete), space: true },
            {
                name: 'query',
                kind: node(Expression),
                label: () => (l) => l.term.query,
                // Must be a boolean
                getType: () => BooleanType.make(),
                space: true,
            },
        ];
    }

    static getPossibleReplacements({ node, type }: EditContext) {
        return node instanceof Expression && type instanceof TableType
            ? [
                  Delete.make(
                      node,
                      ExpressionPlaceholder.make(BooleanType.make()),
                  ),
              ]
            : [];
    }

    static getPossibleAppends() {
        return [
            Delete.make(
                ExpressionPlaceholder.make(TableType.make()),
                ExpressionPlaceholder.make(BooleanType.make()),
            ),
        ];
    }

    getPurpose() {
        return Purpose.Value;
    }

    clone(replace?: Replacement) {
        return new Delete(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('del', this.del, replace),
            this.replaceChild('query', this.query, replace),
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.query
            ? this.table.getType(context)
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            conflicts.push(
                new IncompatibleInput(
                    this.table,
                    tableType,
                    TableType.make([]),
                ),
            );

        // The query must be truthy.
        const queryType = this.query.getType(context);
        if (
            this.query instanceof Expression &&
            !(queryType instanceof BooleanType)
        )
            conflicts.push(
                new IncompatibleInput(
                    this.query,
                    queryType,
                    BooleanType.make(),
                ),
            );

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

    compile(evaluator: Evaluator, context: Context): Step[] {
        /** A derived function based on the query, used to evaluate each row of the table. */
        const query = FunctionDefinition.make(
            undefined,
            Names.make([]),
            undefined,
            [],
            this.query,
            BooleanType.make(),
        );

        return [
            new Start(this),
            ...this.table.compile(evaluator, context),
            ...getIteration<DeleteState, this>(
                this,
                // Initialize a keep list and a counter as we iterate through the rows.
                (evaluator) => {
                    const table = evaluator.peekValue();
                    return table instanceof TableValue
                        ? { index: 0, list: [], table }
                        : evaluator.getValueOrTypeException(
                              this,
                              TableType.make(),
                              table,
                          );
                },
                (evaluator, info) => {
                    if (info.index > info.table.rows.length - 1) return false;
                    else {
                        // Start a new evaluation of the query with the row as scope.
                        evaluator.startEvaluation(
                            new Evaluation(
                                evaluator,
                                this,
                                query,
                                info.table.rows[info.index],
                            ),
                        );
                        return true;
                    }
                },
                (evaluator, info) => {
                    const remove = evaluator.popValue(this, BooleanType.make());
                    if (!(remove instanceof BoolValue)) return remove;
                    // Query was false? Keep instead of deleting.
                    if (remove.bool === false)
                        info.list.push(info.table.rows[info.index]);
                    // Increment the counter.
                    info.index = info.index + 1;
                },
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        const { table, list } = getIterationResult<DeleteState>(evaluator);
        // Pop the table.
        evaluator.popValue(this);

        // Create a new table based on the kept rows
        return new TableValue(this, table.type, list);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeGuards(current, guard);
        if (this.query instanceof Expression)
            this.query.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.del;
    }
    getFinish() {
        return this.del;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Delete;
    getLocalePath() {
        return Delete.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Delete.start,
            new NodeRef(this.table, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Delete.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Delete;
    }
}
