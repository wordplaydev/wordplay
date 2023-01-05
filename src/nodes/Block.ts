import type Node from './Node';
import Bind from './Bind';
import type Conflict from '../conflicts/Conflict';
import { ExpectedEndingExpression } from '../conflicts/ExpectedEndingExpression';
import { IgnoredExpression } from '../conflicts/IgnoredExpression';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '../runtime/Evaluator';
import Start from '../runtime/Start';
import Finish from '../runtime/Finish';
import type Step from '../runtime/Step';
import Halt from '../runtime/Halt';
import type Context from './Context';
import type Definition from './Definition';
import StructureDefinition from './StructureDefinition';
import FunctionDefinition from './FunctionDefinition';
import type TypeSet from './TypeSet';
import ValueException from '../runtime/ValueException';
import None from '../runtime/None';
import ConversionDefinition from './ConversionDefinition';
import Docs from './Docs';
import type Value from '../runtime/Value';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import NoExpressionType from './NoExpressionType';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';

export default class Block extends Expression {
    readonly docs?: Docs;
    readonly open?: Token;
    readonly statements: Expression[];
    readonly close?: Token;

    readonly root: boolean;
    readonly creator: boolean;

    constructor(
        statements: Expression[],
        root: boolean,
        creator: boolean,
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
        this.root = root;
        this.creator = creator;

        this.computeChildren();
    }

    static make(statements: Expression[]) {
        return new Block(
            statements,
            false,
            false,
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
                label: (translation: Translation) =>
                    translation.expressions.Block.statement,
                space: true,
                indent: true,
            },
            { name: 'close', types: [Token] },
        ];
    }

    isBlockFor(child: Node) {
        return !this.root && this.statements.includes(child as Expression);
    }

    clone(replace?: Replacement) {
        return new Block(
            this.replaceChild('statements', this.statements, replace),
            this.root,
            this.creator,
            this.replaceChild('open', this.open, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('docs', this.docs, replace)
        ) as this;
    }

    getLast() {
        return this.statements.length === 0
            ? undefined
            : this.statements[this.statements.length - 1];
    }

    isEvaluationInvolved() {
        return true;
    }

    getScopeOfChild(): Node | undefined {
        return this;
    }

    computeConflicts(): Conflict[] {
        const conflicts = [];

        // Blocks can't be empty. And if they aren't empty, the last statement must be an expression.
        if (
            !this.root &&
            !this.creator &&
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
            .forEach((s) =>
                conflicts.push(new IgnoredExpression(s as Expression))
            );

        if (this.open && this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new EvalCloseToken())
            );

        return conflicts;
    }

    getStatementIndexContaining(node: Node): number | undefined {
        const containingStatement = this.statements.find((s) =>
            s.contains(node)
        );
        if (containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if (index < 0) return;
        return index;
    }

    getDefinitions(node: Node): Definition[] {
        const index = this.getStatementIndexContaining(node);
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
        const parent = context.get(this)?.getParent();

        // If the block is in a structure definition, then it depends on the parent's inputs
        if (this.creator && parent instanceof StructureDefinition)
            return [...parent.inputs];

        // Otherwise, a block's value depends on it's last statement.
        const lastStatement = this.statements[this.statements.length - 1];
        return lastStatement === undefined ? [] : [lastStatement];
    }

    compile(context: Context): Step[] {
        // If there are no statements, halt on exception.
        return !this.creator && this.statements.length === 0
            ? [
                  new Halt(
                      (evaluator) => new ValueException(evaluator, this),
                      this
                  ),
              ]
            : [
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

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Root blocks are allowed to have no value, but all others must have one.
        return (this.creator || this.root) && !evaluator.hasValue()
            ? new None(this)
            : evaluator.popValue(undefined);
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

    getDescription(translation: Translation): string {
        return translation.expressions.Block.description;
    }

    getStartExplanations(translation: Translation): string {
        return translation.expressions.Block.start;
    }

    getFinishExplanations(translation: Translation): string {
        return translation.expressions.Block.finish;
    }

    getStart() {
        return this.open ?? this.getFirstLeaf() ?? this;
    }
    getFinish(): Node {
        return this.close ?? this.getLast() ?? this;
    }
}
