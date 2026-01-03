import { BorrowCycle } from '@conflicts/BorrowCycle';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Block, { BlockKind } from '@nodes/Block';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import BlankException from '@values/BlankException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import ValueRef from '../locale/ValueRef';
import Characters from '../lore/BasisCharacters';
import Borrow from './Borrow';
import type Context from './Context';
import type Definition from './Definition';
import Dimension from './Dimension';
import Expression, { ExpressionKind } from './Expression';
import Language from './Language';
import type Node from './Node';
import { list, node, optional, type Grammar, type Replacement } from './Node';
import Reference from './Reference';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Unit from './Unit';

export default class Program extends Expression {
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token | undefined;

    constructor(borrows: Borrow[], expression: Block, end: Token | undefined) {
        super();

        this.borrows = borrows.slice();
        this.expression = expression;
        this.end = end;

        this.computeChildren();
    }

    static make(expressions: Expression[] = []) {
        return new Program(
            [],
            new Block(expressions, BlockKind.Root),
            new Token('', Sym.End),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Program';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'borrows',
                kind: list(true, node(Borrow)),
                label: () => (l) => l.node.Program.label.borrows,
            },
            {
                name: 'expression',
                kind: node(Block),
                label: () => (l) => l.node.Program.label.expression,
            },
            { name: 'end', kind: optional(node(Sym.End)), label: undefined },
        ];
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    clone(replace?: Replacement) {
        return new Program(
            this.replaceChild('borrows', this.borrows, replace),
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('end', this.end, replace),
        ) as this;
    }

    isEmpty() {
        return this.hasOneLeaf();
    }

    isEvaluationInvolved() {
        return true;
    }
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.expression ? this : this.getParent(context);
    }

    computeConflicts(context: Context) {
        const [borrow, cycle] = context.source.getCycle(context) ?? [];
        if (borrow && cycle) return [new BorrowCycle(this, borrow, cycle)];
        return [];
    }

    /** A program's type is it's block's type. */
    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getDefinitions(_: Node, context: Context): Definition[] {
        const definitions = [];

        for (const borrow of this.borrows) {
            const [source, definition] = borrow.getShare(context) ?? [];
            if (source === undefined) {
                if (definition !== undefined) definitions.push(definition);
            } else {
                definitions.push(
                    definition === undefined ? source : definition,
                );
                definitions.push(source);
            }
        }
        // Return all of the imported definitions and any sources that are part of a named import
        return definitions;
    }

    getLocalesUsed(context: Context): Locale[] {
        // The locales used include any explicit langage tags and locale of binds referred to in the program.
        const locales: Record<string, Locale> = {};

        for (const lang of this.nodes(
            (n): n is Language =>
                n instanceof Language && n.getLanguageText() !== undefined,
        )) {
            const locale = lang.getLocaleID();
            if (locale !== undefined) locales[localeToString(locale)] = locale;
        }

        for (const bind of this.nodes(
            (n): n is Reference => n instanceof Reference,
        )) {
            const def = bind.resolve(context);
            if (def !== undefined) {
                const locale = def.names.getLocaleOf(bind.getName());
                if (locale !== undefined)
                    locales[localeToString(locale)] = locale;
            }
        }

        return Array.from(Object.values(locales));
    }

    getUnitsUsed(): Unit[] {
        return this.nodes((n): n is Unit => n instanceof Unit);
    }
    getDimensionsUsed(): Dimension[] {
        return this.nodes((n): n is Dimension => n instanceof Dimension);
    }

    getDependencies(): Expression[] {
        return [...this.borrows, this.expression];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        // Execute the borrows, then the block, then this.
        return [
            new Start(this),
            ...this.borrows.reduce(
                (steps: Step[], borrow) => [...steps, ...borrow.compile()],
                [],
            ),
            ...this.expression.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get whatever the block computed.
        const value = evaluator.popValue(this);

        // If the block is empty, than rather than return an expected value expression,
        // return a more helpful "emtpy program" exception, then provides some guidance.
        // Otherwise, return whatever the block computed.
        return this.expression.statements.length > 0
            ? value
            : new BlankException(evaluator, this);
    }

    getStart() {
        return this.getFirstLeaf() ?? this.expression;
    }

    getFinish() {
        return this.end ?? this.expression;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Program;
    getLocalePath() {
        return Program.LocalePath;
    }

    getStartExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        const reaction = evaluator.getReactionPriorTo(evaluator.getStepIndex());
        const change = reaction && reaction.changes.length > 0;

        return locales.concretize(
            (l) => l.node.Program.start,
            change
                ? new ValueRef(reaction.changes[0].stream, locales, context)
                : undefined,
            change
                ? new ValueRef(reaction.changes[0].value, locales, context)
                : undefined,
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Program.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Program;
    }

    getKind() {
        return ExpressionKind.Evaluate;
    }
}
