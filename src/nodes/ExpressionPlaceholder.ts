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
import type Translation from '@translation/Translation';
import AtomicExpression from './AtomicExpression';
import type { Description } from '@translation/Translation';
import Glyphs from '../lore/Glyphs';

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
                    translation: Translation,
                    _: Node,
                    context: Context
                ): Description => {
                    const parent: Node | undefined = this.getParent(context);
                    // See if the parent has a label.
                    return (
                        parent?.getChildPlaceholderLabel(
                            this,
                            translation,
                            context
                        ) ?? translation.nodes.ExpressionPlaceholder.placeholder
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

    getDescription(translation: Translation, context: Context) {
        return this.type
            ? this.type.getDescription(translation, context)
            : translation.nodes.ExpressionPlaceholder.description(
                  this,
                  translation,
                  context
              );
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.ExpressionPlaceholder;
    }

    getStartExplanations(translation: Translation) {
        return translation.nodes.ExpressionPlaceholder.start;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
