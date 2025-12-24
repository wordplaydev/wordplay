import Purpose from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import type { InsertContext } from '@edit/EditContext';
import Refer from '@edit/Refer';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Characters from '../lore/BasisCharacters';
import type Bind from './Bind';
import BindToken from './BindToken';
import type Context from './Context';
import Evaluate from './Evaluate';
import type { GuardContext } from './Expression';
import Expression from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Node, { node, type Grammar, type Replacement } from './Node';
import NoExpressionType from './NoExpressionType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

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

    getDescriptor(): NodeDescriptor {
        return 'Input';
    }

    static make(name: Token | string, value: Expression) {
        return new Input(
            typeof name === 'string' ? new Token(name, Sym.Name) : name,
            new BindToken(),
            value,
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleAppends({ parent, context }: InsertContext) {
        // Evaluate, and the anchor is the open or an input? Offer binds to unset properties.
        if (parent instanceof Evaluate) {
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

    getGrammar(): Grammar {
        return [
            { name: 'name', kind: node(Sym.Name), label: undefined },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
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
                label: () => (l) => l.term.value,
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
        return Purpose.Definitions;
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

    getCharacter() {
        return { symbols: this.name.getText() + Characters.Bind };
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Input;
    getLocalePath() {
        return Input.LocalePath;
    }
}
