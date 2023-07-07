import type Node from './Node';
import Bind from './Bind';
import type Conflict from '@conflicts/Conflict';
import { ExpectedEndingExpression } from '@conflicts/ExpectedEndingExpression';
import { IgnoredExpression } from '@conflicts/IgnoredExpression';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import type Context from './Context';
import type Definition from './Definition';
import StructureDefinition from './StructureDefinition';
import FunctionDefinition from './FunctionDefinition';
import type TypeSet from './TypeSet';
import None from '@runtime/None';
import ConversionDefinition from './ConversionDefinition';
import Docs from './Docs';
import type Value from '@runtime/Value';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import NoExpressionType from './NoExpressionType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/locales/concretize';

export enum BlockKind {
    Root = 'root',
    Creator = 'creator',
    Function = 'function',
    Block = 'block',
}

export default class Block extends Expression {
    readonly docs?: Docs;
    readonly open?: Token;
    readonly statements: Expression[];
    readonly close?: Token;

    readonly kind: BlockKind;

    constructor(
        statements: Expression[],
        kind: BlockKind,
        open?: Token,
        close?: Token,
        docs?: Docs
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

    static make(statements: Expression[]) {
        return new Block(
            statements,
            BlockKind.Block,
            new EvalOpenToken(),
            new EvalCloseToken()
        );
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Docs, undefined] },
            { name: 'open', types: [Token] },
            {
                name: 'statements',
                types: [[Expression, Bind]],
                label: (translation: Locale) =>
                    translation.node.Block.statement,
                space: true,
                indent: (parent: Node) =>
                    parent instanceof Block && parent.kind !== BlockKind.Root,
                newline: this.isRoot(),
            },
            { name: 'close', types: [Token] },
        ];
    }

    isRoot() {
        return this.kind === BlockKind.Root;
    }

    isCreator() {
        return this.kind === BlockKind.Creator;
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
            this.docs
        );
    }

    clone(replace?: Replacement) {
        return new Block(
            this.replaceChild('statements', this.statements, replace),
            this.kind,
            this.replaceChild('open', this.open, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('docs', this.docs, replace)
        ) as this;
    }

    withStatement(statement: Expression) {
        return new Block(
            [...this.statements, statement],
            this.kind,
            this.open,
            this.close,
            this.docs
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
            !this.isCreator() &&
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
                    s instanceof Expression &&
                    !(
                        s instanceof StructureDefinition ||
                        s instanceof FunctionDefinition ||
                        s instanceof ConversionDefinition ||
                        s instanceof Bind
                    )
            )
            .forEach((s) => conflicts.push(new IgnoredExpression(this, s)));

        if (this.open && this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new EvalCloseToken())
            );

        return conflicts;
    }

    getStatementIndexContaining(
        node: Node,
        context: Context
    ): number | undefined {
        const containingStatement = this.statements.find(
            (s) => node === s || context.source.root.hasAncestor(node, s)
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
        return this.statements.filter(
            (s, i): s is Bind | FunctionDefinition | StructureDefinition =>
                (s instanceof Bind ||
                    s instanceof FunctionDefinition ||
                    s instanceof StructureDefinition) &&
                i <= index
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
        if (this.isCreator() && parent instanceof StructureDefinition)
            return [...parent.inputs];

        // Otherwise, a block's value depends on it's last statement.
        const lastStatement = this.statements[this.statements.length - 1];
        return lastStatement === undefined ? [] : [lastStatement];
    }

    compile(context: Context): Step[] {
        // If there are no statements, halt on exception.
        return [
            new Start(this),
            ...this.statements.reduce(
                (prev: Step[], current) => [
                    ...prev,
                    ...current.compile(context),
                ],
                []
            ),
            new Finish(this),
        ];
    }

    /** Blocks are constant if they're dependencies are constant, and only if they aren't creators or roots. */
    isConstant(context: Context) {
        return !this.isRoot() && !this.isCreator() && super.isConstant(context);
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop all the values computed.
        const values = [];
        for (let i = 0; i < this.statements.length; i++)
            values.push(evaluator.popValue(this));

        // Root blocks are allowed to have no value, but all others must have one.
        return this.isCreator() ? new None(this) : values[0];
    }

    /**
     * Blocks don't do any type checks, but we do have them delegate type checks to their final expression.
     * since we use them for parentheticals in boolean logic.
     * */
    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.statements.length === 0) return current;
        const last = this.statements[this.statements.length - 1];
        return last instanceof Expression
            ? last.evaluateTypeSet(bind, original, current, context)
            : current;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Block;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.Block.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Block.finish,
            this.getValueIfDefined(locale, context, evaluator)
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

    getGlyphs() {
        return Glyphs.Block;
    }
}
