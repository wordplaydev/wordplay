import type Conflict from '@conflicts/Conflict';
import Placeholder from '@conflicts/Placeholder';
import type EditContext from '@edit/EditContext';
import type { Template } from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Halt from '@runtime/Halt';
import type Step from '@runtime/Step';
import UnimplementedException from '@values/UnimplementedException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import NodeRef from '../locale/NodeRef';
import Characters from '../lore/BasisCharacters';
import BinaryEvaluate from './BinaryEvaluate';
import Bind from './Bind';
import type Context from './Context';
import Evaluate from './Evaluate';
import type Expression from './Expression';
import FunctionDefinition from './FunctionDefinition';
import getConcreteExpectedType from './Generics';
import Input from './Input';
import type Node from './Node';
import { any, node, none, type Grammar, type Replacement } from './Node';
import PlaceholderToken from './PlaceholderToken';
import type Root from './Root';
import SimpleExpression from './SimpleExpression';
import Sym from './Sym';
import type Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import type TypeSet from './TypeSet';
import TypeToken from './TypeToken';
import UnimplementedType from './UnimplementedType';

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
            new PlaceholderToken(),
            type !== undefined ? new TypeToken() : undefined,
            type,
        );
    }

    static getPossibleReplacements({ type }: EditContext) {
        return [ExpressionPlaceholder.make(type)];
    }

    static getPossibleAppends({ type }: EditContext) {
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
                label: (
                    locales: Locales,
                    _: Node,
                    context: Context,
                    root: Root,
                ): Template => {
                    const parent: Node | undefined = root.getParent(this);
                    // See if the parent has a label.
                    return (
                        parent?.getChildPlaceholderLabel(
                            this,
                            locales,
                            context,
                            root,
                        ) ??
                        locales.get(
                            (l) => l.node.ExpressionPlaceholder.placeholder,
                        )
                    );
                },
            },
            {
                name: 'dot',
                kind: any(
                    node(Sym.Type),
                    none(['type', () => TypePlaceholder.make()]),
                ),
            },
            {
                name: 'type',
                kind: any(node(Type), none(['dot', () => new TypeToken()])),
            },
        ];
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    clone(replace?: Replacement) {
        return new ExpressionPlaceholder(
            this.replaceChild('placeholder', this.placeholder, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
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

        return this.type ?? new UnimplementedType(this);
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ExpressionPlaceholder);
    }

    getDescriptionInput(locales: Locales, context: Context) {
        return [
            this.type ? new NodeRef(this.type, locales, context) : undefined,
        ];
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.ExpressionPlaceholder.start);
    }

    getCharacter() {
        return Characters.Placeholder;
    }
}
