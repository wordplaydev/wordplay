import type Conflict from '@conflicts/Conflict';
import type Expression from './Expression';
import type Token from './Token';
import Type from './Type';
import type Node from './Node';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Placeholder from '@conflicts/Placeholder';
import Halt from '@runtime/Halt';
import Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import UnimplementedException from '@values/UnimplementedException';
import PlaceholderToken from './PlaceholderToken';
import UnimplementedType from './UnimplementedType';
import TypeToken from './TypeToken';
import { node, type Grammar, type Replacement, none, any } from './Node';
import SimpleExpression from './SimpleExpression';
import type { Template } from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import type Root from './Root';
import concretize from '../locale/concretize';
import NodeRef from '../locale/NodeRef';
import Evaluate from './Evaluate';
import getConcreteExpectedType from './Generics';
import BinaryEvaluate from './BinaryEvaluate';
import FunctionDefinition from './FunctionDefinition';
import Sym from './Sym';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';

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

    static getPossibleNodes() {
        // Don't pass the type, since we don't want it to be actual text in the program.
        return [ExpressionPlaceholder.make(undefined)];
    }

    getDescriptor() {
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
            { name: 'dot', kind: any(node(Sym.Type), none('type')) },
            {
                name: 'type',
                kind: any(node(Type), none('dot')),
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

        // In an evaluate? Infer from the function's bind type.
        if (parent instanceof Evaluate || parent instanceof BinaryEvaluate) {
            const fun = parent.getFunction(context);
            if (fun) {
                const bind =
                    parent instanceof Evaluate
                        ? parent
                              .getInputMapping(context)
                              ?.inputs.find((map) => map.given === this)
                              ?.expected
                        : fun.inputs[0];
                if (bind) {
                    return getConcreteExpectedType(fun, bind, parent, context);
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
        return concretize(
            locales,
            locales.get((l) => l.node.ExpressionPlaceholder.start),
        );
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
