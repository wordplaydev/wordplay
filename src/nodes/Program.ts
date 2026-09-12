import type { TemplateInput } from '@locale/Locales';
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
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import ValueRef from '@locale/ValueRef';
import Characters from '../lore/BasisCharacters';
import Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Dimension from '@nodes/Dimension';
import Docs from '@nodes/Docs';
import Expression, { ExpressionKind } from '@nodes/Expression';
import Language from '@nodes/Language';
import type Node from '@nodes/Node';
import {
    any,
    list,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import Reference from '@nodes/Reference';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import Unit from '@nodes/Unit';
import UnexampledKit from '@conflicts/UnexampledKit';
import { kitExamples } from '@nodes/publishedShare';
import StructureDefinition from '@nodes/StructureDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Bind from '@nodes/Bind';

export default class Program extends Expression {
    readonly docs: Docs;
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token | undefined;

    constructor(
        docs: Docs | undefined,
        borrows: Borrow[],
        expression: Block,
        end: Token | undefined,
    ) {
        super();

        this.docs = docs ?? Docs.make();
        this.borrows = borrows.slice();
        this.expression = expression;
        this.end = end;

        this.computeChildren();
    }

    static make(expressions: Expression[] = []) {
        return new Program(
            undefined,
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
                name: 'docs',
                kind: any(node(Docs), none()),
                label: () => (l) => l.glossary.documentation.word,
            },
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
            this.replaceChild('docs', this.docs, replace),
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
        // The docs scope to the program for the same reason the block does: what a
        // source's own doc can name is what the source defines (#1374). Without this the
        // chain skips straight from the docs to the `Source`, and an example in a
        // program's doc can name nothing the program declares — see `getDefinitions`.
        return child === this.expression || child === this.docs
            ? this
            : this.getParent(context);
    }

    computeConflicts(context: Context) {
        const [borrow, cycle] = context.source.getCycle(context) ?? [];
        if (borrow && cycle) return [new BorrowCycle(this, borrow, cycle)];

        // A published source with no example anywhere has no preview, and the registry
        // renders one (#8). The absence has no node more specific than the program.
        if (
            context.project.isPublishedKitSource(context.source) &&
            kitExamples(context.source).length === 0
        )
            return [new UnexampledKit(this)];

        return [];
    }

    /** A program's type is it's block's type. */
    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        const definitions = [];

        // What a borrow contributes is the borrow's own question: a kit named with
        // nothing after it brings in every share, and scope has to match what evaluation
        // binds or a name works at runtime and is unknown in the editor. See
        // Borrow.getScopeDefinitions.
        for (const borrow of this.borrows)
            definitions.push(...borrow.getScopeDefinitions(context));

        // A source's own doc can name what the source defines (#1374). Everything the
        // program declares is inside its block, so a doc attached to the *program* sits
        // outside that scope — which made the most natural thing a kit author can write,
        // an example calling the thing the doc explains, report `UnknownName` with no
        // workaround available. `parseProgram` hoists a leading doc onto the program, so
        // this is also the only place such an example can live at all.
        //
        // Scoped to the docs: anything else under a program is under its block, and gets
        // block scope in the ordinary way, including the "only what's above you" rule
        // that a doc has no reason to obey.
        if (this.docs.contains(node))
            for (const statement of this.expression.statements)
                if (
                    statement instanceof Bind ||
                    statement instanceof FunctionDefinition ||
                    statement instanceof StructureDefinition
                )
                    definitions.push(statement);

        // Return all of the imported definitions and any sources that are part of a named import
        return definitions;
    }

    getLocalesUsed(context: Context): Locale[] {
        // The locales used include any explicit language tags and locales of
        // binds referred to in the program. For multilingual tags (e.g.
        // `/es_en`) we surface each individual language AND the multilingual
        // combination, so language pickers can offer both.
        const locales: Record<string, Locale> = {};

        for (const lang of this.nodes(
            (n): n is Language =>
                n instanceof Language && n.getLanguageText() !== undefined,
        )) {
            for (const locale of lang.getPickerLocaleIDs())
                locales[localeToString(locale)] = locale;
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

        return locales.concretize((l) => l.node.Program.start, {
            stream: change
                ? new ValueRef(reaction.changes[0].stream, locales, context)
                : undefined,
            value: change
                ? new ValueRef(reaction.changes[0].value, locales, context)
                : undefined,
        });
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.Program.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs(
        _: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            count: this.expression.statements.length,
        };
    }

    getCharacter() {
        return Characters.Program;
    }

    getKind() {
        return ExpressionKind.Evaluate;
    }
}
