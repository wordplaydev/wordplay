import Purpose from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import type Locales from '@locale/Locales';
import type { NodeText, DescriptiveNodeText } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Glyph from '../lore/Glyph';
import type Context from './Context';
import Expression from './Expression';
import type { GuardContext } from './Expression';
import type Node from './Node';
import { node, type Grammar, type Replacement } from './Node';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Token from './Token';
import Sym from './Sym';
import BindToken from './BindToken';
import Glyphs from '../lore/Glyphs';
import SimpleExpression from './SimpleExpression';
import Evaluate from './Evaluate';
import Refer from '@edit/Refer';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Definition from './Definition';

export default class Input extends SimpleExpression {
    readonly name: Token;
    readonly bind: Token;
    readonly value: Expression;

    constructor(name: Token, bind: Token, value: Expression) {
        super();
        this.name = name;
        this.bind = bind;
        this.value = value;
    }

    getDescriptor() {
        return 'Input';
    }

    static make(name: Token | string, value: Expression) {
        return new Input(
            typeof name === 'string' ? new Token(name, Sym.Name) : name,
            new BindToken(),
            value,
        );
    }

    static getPossibleNodes(
        expectedType: Type | undefined,
        anchor: Node,
        isBeingReplaced: boolean,
        context: Context,
    ) {
        const parent = anchor.getParent(context);
        // Evaluate, and the anchor is the open or an input? Offer binds to unset properties.
        if (
            parent instanceof Evaluate &&
            (anchor === parent.open ||
                (anchor instanceof Expression &&
                    parent.inputs.includes(anchor)))
        ) {
            const mapping = parent.getInputMapping(context);
            return mapping?.inputs
                .filter((input) => input.given === undefined)
                .map(
                    (input) =>
                        new Refer(
                            (name) =>
                                Input.make(name, ExpressionPlaceholder.make()),
                            input.expected,
                        ),
                );
        } else return [];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'name',
                kind: node(Sym.Name),
            },
            {
                name: 'bind',
                kind: node(Sym.Bind),
            },
            {
                name: 'value',
                kind: node(Expression),
                space: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Input(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('value', this.value, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    computeType(context: Context): Type {
        return this.value.getType(context);
    }

    /** Never constant, as we always reevaluate functions. */
    isConstant(): boolean {
        return false;
    }

    getDependencies(): Expression[] {
        return [this.value];
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext): TypeSet {
        return this.value.evaluateTypeGuards(current, guard);
    }

    /** Get the bind to which this input corresponds. */
    getCorrespondingDefinition(context: Context): Definition | undefined {
        const parent = context.getRoot(this)?.getParent(this);
        if (parent instanceof Evaluate) {
            const fun = parent.getFunction(context);
            if (fun)
                return fun.inputs.find((input) =>
                    input.hasName(this.getName()),
                );
        }

        return undefined;
    }

    getName() {
        return this.name.getText();
    }

    computeConflicts(): void | Conflict[] {}

    compile(evaluator: Evaluator, context: Context): Step[] {
        return this.value.compile(evaluator, context);
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        return prior ?? evaluator.popValue(this);
    }

    getStart(): Node {
        return this.name;
    }

    getFinish(): Node {
        return this.bind;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Input.start);
    }

    getGlyphs(): Glyph {
        return { symbols: this.name.getText() + Glyphs.Bind };
    }

    getNodeLocale(locales: Locales): NodeText | DescriptiveNodeText {
        return locales.get((l) => l.node.Input);
    }
}
