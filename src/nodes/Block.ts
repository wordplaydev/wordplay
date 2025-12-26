import type Conflict from '@conflicts/Conflict';
import { ExpectedEndingExpression } from '@conflicts/ExpectedEndingExpression';
import { IgnoredExpression } from '@conflicts/IgnoredExpression';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type { InsertContext, ReplaceContext } from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import NoneValue from '@values/NoneValue';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Bind from './Bind';
import type Context from './Context';
import type Definition from './Definition';
import DefinitionExpression from './DefinitionExpression';
import Docs from './Docs';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import Expression, { ExpressionKind, type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import NoExpressionType from './NoExpressionType';
import type Node from './Node';
import { any, list, node, none, type Grammar, type Replacement } from './Node';
import Reference from './Reference';
import StructureDefinition from './StructureDefinition';
import Sym from './Sym';
import type Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

export enum BlockKind {
    Root = 'root',
    Structure = 'creator',
    Function = 'function',
    Block = 'block',
}

export default class Block extends Expression {
    readonly docs: Docs | undefined;
    readonly open: Token | undefined;
    readonly statements: Expression[];
    readonly close: Token | undefined;

    readonly kind: BlockKind;

    constructor(
        statements: Expression[],
        kind: BlockKind,
        open?: Token,
        close?: Token,
        docs?: Docs,
    ) {
        super();

        this.open = open;
        this.statements = statements;
        this.close = close;
        this.docs =
            docs === undefined
                ? undefined
                : docs instanceof Docs
                  ? docs
                  : new Docs(docs);
        this.kind = kind;

        this.computeChildren();
    }

    static make(statements?: Expression[]) {
        return new Block(
            statements ?? [],
            BlockKind.Block,
            new EvalOpenToken(),
            new EvalCloseToken(),
        );
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        // Offer to parenthesize the node, or add docs if there aren't any.
        return node instanceof Expression
            ? [
                  Block.make([node]),
                  ...(node instanceof Block &&
                  (node.docs === undefined || node.docs.docs.length === 0)
                      ? [node.withDocs()]
                      : []),
              ]
            : [];
    }

    static getPossibleInsertions({
        type,
        context,
        locales,
        parent,
        index,
    }: InsertContext) {
        if (!(parent instanceof Block)) return [];
        const definitions = [
            ...parent.getDefinitionsInScope(context),
            ...(index === undefined ? [] : parent.getDefinitionsBefore(index)),
        ];
        return [
            // Offer a block with an expression placeholder of the desired type.
            Block.make([ExpressionPlaceholder.make(type)]),
            // Offer a bind with the expected type
            Bind.make(
                undefined,
                Names.make(['_']),
                undefined,
                ExpressionPlaceholder.make(type),
            ),
            // Offer references to anything in scope, including anything in the parent's scope
            // and anything defined prior to the insertion point in this block.
            ...definitions
                .map((def) =>
                    def instanceof FunctionDefinition
                        ? def.getEvaluateTemplate(locales, context, undefined)
                        : def instanceof StructureDefinition
                          ? def.getEvaluateTemplate(locales, context)
                          : def instanceof Bind
                            ? Reference.make(
                                  def.names
                                      .getPreferredName(locales.getLocale())
                                      ?.getName() ?? '_',
                              )
                            : undefined,
                )
                .filter((n) => n !== undefined),
        ];
    }

    getEvaluationExpression(): Expression {
        // This expression evaluates itself.
        return this;
    }

    getDescriptor(): NodeDescriptor {
        return 'Block';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: any(node(Docs), none()),
                label: () => (l) => l.term.documentation,
            },
            {
                name: 'open',
                kind: any(node(Sym.EvalOpen), none()),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'statements',
                kind: list(this.isRoot(), node(Expression), node(Bind)),
                label: () => (l) => l.node.Block.label.statements,
                indent: !this.isRoot(),
                newline:
                    this.isRoot() ||
                    (this.isStructure() && this.statements.length > 0) ||
                    this.statements.length > 1,
                initial: this.isStructure(),
            },
            {
                name: 'close',
                kind: any(node(Sym.EvalClose), none()),
                label: undefined,
                // If it's a structure with more than one definition, insert new line
                newline: this.isStructure() && this.statements.length > 0,
                uncompletable: true,
            },
        ];
    }

    getPurpose() {
        return Purpose.Definitions;
    }

    /** If its the root block of a program. */
    isRoot() {
        return this.kind === BlockKind.Root;
    }

    isStructure() {
        return this.kind === BlockKind.Structure;
    }

    isBlockFor(child: Node) {
        return !this.isRoot() && this.statements.includes(child as Expression);
    }

    asFunctionBlock() {
        return new Block(
            this.statements,
            BlockKind.Function,
            this.open,
            this.close,
            this.docs,
        );
    }

    clone(replace?: Replacement) {
        return new Block(
            this.replaceChild('statements', this.statements, replace),
            this.kind,
            this.replaceChild('open', this.open, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('docs', this.docs, replace),
        ) as this;
    }

    withDocs(docs?: Docs) {
        return new Block(
            this.statements,
            this.kind,
            this.open,
            this.close,
            docs ?? Docs.make(),
        );
    }

    withStatement(statement: Expression) {
        return new Block(
            [...this.statements, statement],
            this.kind,
            this.open,
            this.close,
            this.docs,
        );
    }

    getLast() {
        return this.statements.length === 0
            ? undefined
            : this.statements[this.statements.length - 1];
    }

    isEvaluationInvolved() {
        return this.kind !== BlockKind.Block;
    }

    getScopeOfChild(): Node | undefined {
        return this;
    }

    computeConflicts(): Conflict[] {
        const conflicts = [];

        // Non-root blocks can't be empty. And if they aren't empty, the last statement must be an expression.
        if (
            !this.isRoot() &&
            !this.isStructure() &&
            (this.statements.length === 0 ||
                !(
                    this.statements[this.statements.length - 1] instanceof
                    Expression
                ))
        )
            conflicts.push(new ExpectedEndingExpression(this));

        // The only expression allowed is the last one.
        this.statements
            .slice(0, this.statements.length - 1)
            .filter(
                (s) =>
                    !(s instanceof DefinitionExpression || s instanceof Bind),
            )
            .forEach((s) => conflicts.push(new IgnoredExpression(this, s)));

        if (this.open && this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new EvalCloseToken()),
            );

        return conflicts;
    }

    getStatementIndexContaining(
        node: Node,
        context: Context,
    ): number | undefined {
        const containingStatement = this.statements.find(
            (s) => node === s || context.source.root.hasAncestor(node, s),
        );
        if (containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if (index < 0) return;
        return index;
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        const index = this.getStatementIndexContaining(node, context);
        if (index === undefined) return [];

        // Expose any bind, function, or structures, including on the line that contains this node, to allow them to refer to themselves.
        // But don't expose any definitions if the node is after the definition.
        return this.getDefinitionsBefore(index);
    }

    getDefinitionsBefore(index: number): Definition[] {
        return this.statements.filter(
            (s, i): s is Bind | FunctionDefinition | StructureDefinition =>
                (s instanceof Bind ||
                    s instanceof FunctionDefinition ||
                    s instanceof StructureDefinition) &&
                i <= index,
        );
    }

    computeType(context: Context): Type {
        // The type of the last expression.
        const lastExpression = this.statements
            .slice()
            .reverse()
            .find((s) => s instanceof Expression) as Expression | undefined;
        return lastExpression === undefined
            ? new NoExpressionType(this)
            : lastExpression.getType(context);
    }

    getDependencies(context: Context): Expression[] {
        const parent = this.getParent(context);

        // If the block is in a structure definition, then it depends on the parent's inputs
        if (this.isStructure() && parent instanceof StructureDefinition)
            return [...parent.inputs];

        // Otherwise, a block's value depends on it's last statement.
        const lastStatement = this.statements[this.statements.length - 1];
        return lastStatement === undefined ? [] : [lastStatement];
    }

    /** Used by Evaluator to get the steps for the evaluation of this block. */
    getEvaluationSteps(evaluator: Evaluator, context: Context) {
        return this.statements.reduce(
            (prev: Step[], current) => [
                ...prev,
                ...current.compile(evaluator, context),
            ],
            [],
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    compile(evaluator: Evaluator, context: Context): Step[] {
        // A block starts a new evaluation of its steps.
        return [
            new Start(this, (evaluator) => {
                // Create a new evaluation to enable closures on bindings created in this block.
                evaluator.startEvaluation(
                    new Evaluation(
                        evaluator,
                        // This is the evaluation's evaluator
                        this,
                        // This is also the evaluation's definition
                        this,
                        // Closure is the current evaluation
                        evaluator.getCurrentEvaluation(),
                    ),
                );
                return undefined;
            }),
            new Finish(this),
        ];
    }

    /** Blocks are constant if they're dependencies are constant, and only if they aren't creators or roots. */
    isConstant(context: Context) {
        return (
            !this.isRoot() && !this.isStructure() && super.isConstant(context)
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get the last value computed in the evaluation's stack.
        const result = evaluator.popValue(this);

        // Root blocks are allowed to have no value, but all others must have one.
        return this.isStructure() ? new NoneValue(this) : result;
    }

    /**
     * Blocks don't do any type checks, but we do have them delegate type checks to their final expression.
     * since we use them for parentheticals in boolean logic.
     * */
    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.statements.length === 0) return current;
        const last = this.statements[this.statements.length - 1];
        return last instanceof Expression
            ? last.evaluateTypeGuards(current, guard)
            : current;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Block;
    getLocalePath() {
        return Block.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Block.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Block.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs() {
        return [this.statements.length];
    }

    getStart() {
        return this.open ?? this.getFirstLeaf() ?? this;
    }

    getFinish(): Node {
        return this.close ?? this.getLast() ?? this;
    }

    getCharacter() {
        return Characters.Block;
    }

    getKind() {
        return ExpressionKind.Evaluate;
    }
}
