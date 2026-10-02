import conciseRef from '#nodes/conciseRef.ts';
import ValueException from '#values/ValueException.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import getConceptName from '#locale/getConceptName.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type Context from '#nodes/Context.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Bind from '#nodes/Bind.ts';
import Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import BoolValue from '#values/BoolValue.ts';
import type Value from '#values/Value.ts';
import { getIteration, getIterationResult } from '#basis/Iteration.ts';
import { Purpose } from '#concepts/Purpose.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import { DELETE_SYMBOL } from '#parser/Symbols.ts';
import type StructureValue from '#values/StructureValue.ts';
import TableValue from '#values/TableValue.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Definition from '#nodes/Definition.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import Names from '#nodes/Names.ts';
import type Node from '#nodes/Node.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import TableType from '#nodes/TableType.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

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
                label: () => (l) => getConceptName(l, 'table'),
            },
            {
                name: 'del',
                kind: node(Sym.Delete),
                space: true,
                label: undefined,
            },
            {
                name: 'query',
                kind: node(Expression),
                label: () => (l) => l.glossary.query.word,
                // Must be a boolean
                getType: () => BooleanType.make(),
                space: true,
            },
        ];
    }

    static getPossibleReplacements({ node, type }: ReplaceContext) {
        // Offer to wrap the table expression in a delete.
        return node instanceof Expression && type instanceof TableType
            ? [
                  Delete.make(
                      node,
                      ExpressionPlaceholder.make(BooleanType.make()),
                  ),
              ]
            : [];
    }

    static getPossibleInsertions() {
        return [];
    }

    getPurpose() {
        return Purpose.Tables;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Delete(
                this.replaceChild('table', this.table, replace),
                this.replaceChild('del', this.del, replace),
                this.replaceChild('query', this.query, replace),
            ),
        );
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
        if (
            !context.isUnknownDownstream(this.table) &&
            !(tableType instanceof TableType)
        )
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
            !context.isUnknownDownstream(this.query) &&
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
            return type.columns.filter(
                (col): col is Bind => col instanceof Bind,
            );
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
                    const row = info.table.rows[info.index];
                    if (remove.bool === false && row !== undefined)
                        info.list.push(row);
                    // Increment the counter.
                    info.index = info.index + 1;
                },
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        const state = getIterationResult<DeleteState>(evaluator);
        if (state === undefined) return new ValueException(evaluator, this);
        const { table, list } = state;
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

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Delete.start);
    }

    getFinishExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Delete.finish);
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            table: conciseRef(this.table, locales, context),
            query: conciseRef(this.query, locales, context),
        };
    }

    getCharacter() {
        return Characters.Delete;
    }
}
