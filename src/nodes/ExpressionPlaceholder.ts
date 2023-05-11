import type Conflict from '@conflicts/Conflict';
import type Expression from './Expression';
import Token from './Token';
import Type from './Type';
import type Node from './Node';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Placeholder from '@conflicts/Placeholder';
import Halt from '@runtime/Halt';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import UnimplementedException from '@runtime/UnimplementedException';
import PlaceholderToken from './PlaceholderToken';
import UnimplementedType from './UnimplementedType';
import TypeToken from './TypeToken';
import type { Replacement } from './Node';
import type Locale from '@translation/Locale';
import AtomicExpression from './AtomicExpression';
import type { Description } from '@translation/Locale';
import Glyphs from '../lore/Glyphs';
import type Root from './Root';

export default class ExpressionPlaceholder extends AtomicExpression {
    readonly placeholder: Token;
    readonly dot: Token | undefined;
    readonly type: Type | undefined;

    constructor(
        placeholder: Token,
        dot: Token | undefined,
        type: Type | undefined
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
            type
        );
    }

    getGrammar() {
        return [
            {
                name: 'placeholder',
                types: [Token],
                label: (
                    translation: Locale,
                    _: Node,
                    context: Context,
                    root: Root
                ): Description => {
                    const parent: Node | undefined = root.getParent(this);
                    // See if the parent has a label.
                    return (
                        parent?.getChildPlaceholderLabel(
                            this,
                            translation,
                            context,
                            root
                        ) ?? translation.node.ExpressionPlaceholder.placeholder
                    );
                },
            },
            { name: 'dot', types: [Token, undefined] },
            { name: 'type', types: [Type, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new ExpressionPlaceholder(
            this.replaceChild('placeholder', this.placeholder, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('type', this.type, replace)
        ) as this;
    }

    computeConflicts(): Conflict[] {
        return [new Placeholder(this)];
    }

    computeType(): Type {
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
                this
            ),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        return new UnimplementedException(evaluator, this);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.placeholder;
    }
    getFinish() {
        return this.placeholder;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ExpressionPlaceholder;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.ExpressionPlaceholder.start;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
