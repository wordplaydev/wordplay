import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import Placeholder from '#conflicts/Placeholder.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type { LocaleText } from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Halt from '#runtime/Halt.ts';
import type Step from '#runtime/Step.ts';
import UnimplementedException from '#values/UnimplementedException.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import Characters from '../lore/BasisCharacters';
import AnyType from '#nodes/AnyType.ts';
import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Bind from '#nodes/Bind.ts';
import type Context from '#nodes/Context.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import getConcreteExpectedType from '#nodes/Generics.ts';
import Input from '#nodes/Input.ts';
import type Node from '#nodes/Node.ts';
import {
    any,
    node,
    none,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import PlaceholderToken from '#nodes/PlaceholderToken.ts';
import type Root from '#nodes/Root.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import UnionType from '#nodes/UnionType.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import TypeToken from '#nodes/TypeToken.ts';

export default class ExpressionPlaceholder extends SimpleExpression {
    readonly placeholder: Token | undefined;
    readonly dot: Token | undefined;
    readonly type: Type | undefined;

    constructor(
        placeholder: Token | undefined,
        dot: Token | undefined,
        type: Type | undefined,
    ) {
        super();

        this.placeholder = placeholder;
        this.dot = dot;
        this.type = type;

        this.computeChildren();
    }

    static make(type?: Type) {
        // Clone the type; we don't want it making it's way to a program.
        return new ExpressionPlaceholder(
            PlaceholderToken(),
            type !== undefined ? TypeToken() : undefined,
            type,
        );
    }

    /**
     * The ordered candidate default expressions for this placeholder's expected
     * type: ask the placeholder's computed type (or each member of a union) for
     * its default expression, dropping the types that have none. The first
     * element is the top pick the autocomplete menu would offer. Returns an empty
     * list if no member type has a default (e.g. an un-inferable AnyType).
     */
    static getDefaultExpressions(
        placeholder: ExpressionPlaceholder,
        context: Context,
        locales: Locales,
    ): Expression[] {
        const type = placeholder.computeType(context);
        const types =
            type instanceof UnionType
                ? type.getLocalizedTypes(locales, context)
                : [type];
        return types
            .map((t) => t.getDefaultExpression(context))
            .filter((e): e is Exclude<typeof e, undefined> => e !== undefined);
    }

    static getPossibleReplacements({ node, context, locales }: ReplaceContext) {
        if (!(node instanceof ExpressionPlaceholder)) return [];
        return ExpressionPlaceholder.getDefaultExpressions(
            node,
            context,
            locales,
        );
    }

    static getPossibleInsertions({ type }: InsertContext) {
        return [ExpressionPlaceholder.make(type)];
    }

    getDescriptor(): NodeDescriptor {
        return 'ExpressionPlaceholder';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'placeholder',
                kind: node(Sym.Placeholder),
                label: (locales: Locales, context: Context, _, root: Root) => {
                    const parent: Node | undefined = root.getParent(this);
                    // See if the parent has a label.
                    return (
                        parent?.getChildPlaceholderLabel(
                            this,
                            locales,
                            context,
                            root,
                        ) ??
                        ((l: LocaleText) =>
                            l.node.ExpressionPlaceholder.label.placeholder)
                    );
                },
            },
            {
                name: 'dot',
                kind: any(
                    node(Sym.Type),
                    none(['type', () => TypePlaceholder.make()]),
                ),
                label: undefined,
            },
            {
                name: 'type',
                kind: any(node(Type), none(['dot', () => TypeToken()])),
                label: undefined,
            },
        ];
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new ExpressionPlaceholder(
                this.replaceChild('placeholder', this.placeholder, replace),
                this.replaceChild('dot', this.dot, replace),
                this.replaceChild('type', this.type, replace),
            ),
        );
    }

    computeConflicts(): Conflict[] {
        return [new Placeholder(this)];
    }

    computeType(context: Context): Type {
        // Is the type given? Return it.
        if (this.type) return this.type;

        // Try to infer from surroundings.
        const parent = context.getRoot(this)?.getParent(this);

        const evaluate =
            parent instanceof Evaluate
                ? parent
                : parent instanceof BinaryEvaluate
                  ? parent
                  : parent && parent instanceof Input
                    ? context.getRoot(this)?.getParent(parent)
                    : undefined;

        // In an evaluate? Infer from the function's bind type.
        if (
            evaluate instanceof Evaluate ||
            evaluate instanceof BinaryEvaluate
        ) {
            const fun = evaluate.getFunction(context);
            if (fun) {
                const bind =
                    parent instanceof Evaluate
                        ? parent
                              .getInputMapping(context)
                              ?.inputs.find((map) => map.given === this)
                              ?.expected
                        : fun.inputs[0];
                if (bind) {
                    return getConcreteExpectedType(
                        fun,
                        bind,
                        evaluate,
                        context,
                    );
                }
            }
        } else if (parent instanceof Bind) return parent.getType(context);
        // Expression of a function definition? Infer from the function's output type.
        else if (parent instanceof FunctionDefinition) {
            if (parent.output) return parent.output;
        }

        return new AnyType();
    }

    isPlaceholder() {
        return true;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [
            new Halt(
                (evaluator) => new UnimplementedException(evaluator, this),
                this,
            ),
        ];
    }

    withType(type: Type | undefined) {
        return new ExpressionPlaceholder(
            this.placeholder,
            new Token(TYPE_SYMBOL, Sym.Type),
            type,
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        return new UnimplementedException(evaluator, this);
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.placeholder ?? this;
    }
    getFinish() {
        return this.placeholder ?? this;
    }

    static readonly LocalePath = (l: LocaleText) =>
        l.node.ExpressionPlaceholder;
    getLocalePath() {
        return ExpressionPlaceholder.LocalePath;
    }

    getDescriptionInput(locales: Locales, context: Context) {
        return [
            this.type ? new NodeRef(this.type, locales, context) : undefined,
        ];
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.ExpressionPlaceholder.start);
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            type: this.type
                ? new NodeRef(this.type, locales, context)
                : undefined,
        };
    }

    getCharacter() {
        return Characters.Placeholder;
    }
}
