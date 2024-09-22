import Purpose from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import type Locales from '@locale/Locales';
import type { NodeText, DescriptiveNodeText } from '@locale/NodeTexts';
import type Glyph from '../lore/Glyph';
import type Context from './Context';
import Expression from './Expression';
import type { GuardContext } from './Expression';
import Node from './Node';
import { node, type Grammar, type Replacement } from './Node';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Token from './Token';
import Sym from './Sym';
import BindToken from './BindToken';
import Glyphs from '../lore/Glyphs';
import Evaluate from './Evaluate';
import Refer from '@edit/Refer';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Bind from './Bind';
import NoExpressionType from './NoExpressionType';
import type EditContext from '@edit/EditContext';

export default class Input extends Node {
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

    static getPossibleReplacements({ node, context }: EditContext) {
        const parent = node.getParent(context);
        // Evaluate, and the anchor is the open or an input? Offer binds to unset properties.
        if (
            parent instanceof Evaluate &&
            (node === parent.open ||
                (node instanceof Expression && parent.inputs.includes(node)))
        ) {
            const mapping = parent.getInputMapping(context);
            return mapping?.inputs
                .filter((input) => input.given === undefined)
                .map(
                    (input, index, inputs) =>
                        new Refer((name) => {
                            const value =
                                input.expected.type?.getDefaultExpression(
                                    context,
                                ) ?? ExpressionPlaceholder.make();
                            // If all prior inputs were given, then we don't need a name on this next one.
                            return inputs
                                .slice(0, index)
                                .every((i) => i.given !== undefined)
                                ? value
                                : Input.make(name, value);
                        }, input.expected),
                );
        } else return [];
    }

    static getPossibleAppends(context: EditContext) {
        return this.getPossibleReplacements(context);
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
                getType: (context: Context) => {
                    const parent = this.getParent(context);
                    // Evaluate, and the anchor is the open or an input? Offer binds to unset properties.
                    if (parent instanceof Evaluate) {
                        const mapping = parent.getInputMapping(context);
                        const bind = mapping?.inputs.find(
                            (i) => i.given === this,
                        )?.expected;
                        if (bind && bind.type) return bind.type;
                    }
                    return new NoExpressionType(this.value);
                },
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

    getType(context: Context): Type {
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
    getCorrespondingDefinition(context: Context): Bind | undefined {
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

    computeConflicts(): Conflict[] {
        return [];
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
