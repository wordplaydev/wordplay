import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import UnionType from '@nodes/UnionType';
import Refer from '@edit/revision/Refer';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Characters from '../lore/BasisCharacters';
import type Bind from '@nodes/Bind';
import BindToken from '@nodes/BindToken';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import type { GuardContext } from '@nodes/Expression';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Node, { node, type Grammar, type Replacement } from '@nodes/Node';
import NoExpressionType from '@nodes/NoExpressionType';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

export default class Input extends Node {
    readonly name: Token;
    readonly bind: Token;
    readonly value: Expression;
    /** An optional separator betweeen inputs */
    readonly separator: Token | undefined;

    constructor(
        name: Token,
        bind: Token,
        value: Expression,
        separator: Token | undefined,
    ) {
        super();
        this.name = name;
        this.bind = bind;
        this.value = value;
        this.separator = separator;
    }

    getDescriptor(): NodeDescriptor {
        return 'Input';
    }

    static make(name: Token | string, value: Expression) {
        return new Input(
            typeof name === 'string' ? new Token(name, Sym.Name) : name,
            new BindToken(),
            value,
            undefined,
        );
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        if (!(node instanceof Input)) return [];
        const parent = node.getParent(context);
        if (!(parent instanceof Evaluate)) return [];
        const mapping = parent.getInputMapping(context);
        const expected = mapping?.inputs.find((i) => i.given === node)?.expected;
        if (expected === undefined) return [];
        const types =
            expected.type instanceof UnionType
                ? expected.type.enumerate()
                : expected.type
                  ? [expected.type]
                  : undefined;
        return (
            types
                ?.map((t) => t.getDefaultExpression(context))
                .filter((e): e is Exclude<typeof e, undefined> => e !== undefined)
                .map(
                    (value) =>
                        new Refer(
                            (name) => Input.make(name, value),
                            expected,
                        ),
                ) ?? [
                new Refer(
                    (name) => Input.make(name, ExpressionPlaceholder.make()),
                    expected,
                ),
            ]
        );
    }

    /** When the name token of an Input is the menu anchor, surface Input
     *  variants whose name picks a different parameter of the parent Evaluate's
     *  function — restricted to parameters whose declared type accepts the
     *  current value's type. The current value (and surrounding tokens) are
     *  preserved so the user is just renaming, not editing the value. */
    getReplacementsForTokenAnchor(context: Context): Input[] {
        const parent = this.getParent(context);
        if (!(parent instanceof Evaluate)) return [];
        const fun = parent.getFunction(context);
        if (fun === undefined) return [];

        const valueType = this.value.getType(context);
        const currentName = this.name.getText();

        return fun.inputs
            .filter((bind) => {
                if (bind.getNames().includes(currentName)) return false;
                const expected = bind.getType(context);
                return expected.accepts(valueType, context);
            })
            .map(
                (bind) =>
                    new Input(
                        new Token(bind.getNames()[0], Sym.Name),
                        this.bind,
                        this.value,
                        this.separator,
                    ),
            );
    }

    static getPossibleInsertions({ parent, context }: InsertContext) {
        // If the parent is an evaluate, offer inputs.
        if (parent instanceof Evaluate) {
            const mapping = parent.getInputMapping(context);
            return mapping?.inputs
                .filter(
                    (input) =>
                        input.given === undefined ||
                        input.expected.isVariableLength(),
                )
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
            { name: 'separator', kind: node(Sym.Separator), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new Input(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('value', this.value, replace),
            this.replaceChild('separator', this.separator, replace),
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
