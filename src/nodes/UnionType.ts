import type ConversionDefinition from './ConversionDefinition';
import type FunctionDefinition from './FunctionDefinition';
import type Context from './Context';
import Token from './Token';
import type Node from './Node';
import Sym from './Sym';
import Type from './Type';
import { OR_SYMBOL } from '@parser/Symbols';
import type TypeSet from './TypeSet';
import NeverType from './NeverType';
import type { BasisTypeName } from '../basis/BasisConstants';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NoneType from './NoneType';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import TypePlaceholder from './TypePlaceholder';

export default class UnionType extends Type {
    readonly left: Type;
    readonly or: Token;
    readonly right: Type;

    constructor(left: Type, or: Token, right: Type) {
        super();

        this.left = left;
        this.or = or;
        this.right = right;

        this.computeChildren();
    }

    static make(left: Type, right: Type) {
        return new UnionType(left, new Token(OR_SYMBOL, Sym.Union), right);
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean
    ) {
        return [
            node instanceof Type && selected
                ? UnionType.make(node, TypePlaceholder.make())
                : UnionType.make(
                      TypePlaceholder.make(),
                      TypePlaceholder.make()
                  ),
        ];
    }

    static orNone(left: Type) {
        return this.make(left, NoneType.make());
    }

    getGrammar(): Grammar {
        return [
            { name: 'left', kind: node(Type) },
            { name: 'or', kind: node(Sym.Union) },
            { name: 'right', kind: node(Type) },
        ];
    }

    clone(replace?: Replacement) {
        return new UnionType(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('or', this.or, replace),
            this.replaceChild('right', this.right, replace)
        ) as this;
    }

    enumerate(): Type[] {
        return [
            ...(this.left instanceof UnionType
                ? this.left.enumerate()
                : [this.left]),
            ...(this.right instanceof UnionType
                ? this.right.enumerate()
                : [this.right]),
        ];
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        // Union types accept a given type T if T is a subset of the union type.
        // For example:
        // A | B accepts A? Yes
        // A | B accepts B? Yes
        // A | B accepts A | B? Yes
        // A | B accepts A | C? No
        // A | B accepts A | B | C? No
        // A | B accepts C? No

        // A union type accepts a type if it's right or left accepts the type.
        return this.getTypeSet(context).containsAll(types, context);
    }

    /** Override the default and return all types in this union. */
    getPossibleTypes(context: Context): Type[] {
        return [
            ...this.left.getPossibleTypes(context),
            ...this.right.getPossibleTypes(context),
        ];
    }

    containsType(type: Type, context: Context) {
        return (
            this.left.accepts(type, context) ||
            !(this.right instanceof Type) ||
            this.right.accepts(type, context)
        );
    }

    /** Override the basis conversion search to check both types */
    getConversion(
        context: Context,
        input: Type,
        output: Type
    ): ConversionDefinition | undefined {
        const left = context
            .getBasis()
            .getConversion(
                this.left.getBasisTypeName(),
                context,
                input,
                output
            );
        if (left !== undefined) return left;
        return this.right instanceof Type
            ? context
                  .getBasis()
                  .getConversion(
                      this.right.getBasisTypeName(),
                      context,
                      input,
                      output
                  )
            : undefined;
    }

    getFunction(
        context: Context,
        name: string
    ): FunctionDefinition | undefined {
        const left = context
            .getBasis()
            .getFunction(this.left.getBasisTypeName(), name);
        if (left !== undefined) return left;
        return this.right instanceof Type
            ? context
                  .getBasis()
                  .getFunction(this.right.getBasisTypeName(), name)
            : undefined;
    }

    getBasisTypeName(): BasisTypeName {
        return 'union';
    }

    computeConflicts() {
        return [];
    }

    /** Override the base class: basis type scopes are their basis structure definitions. */
    getScope(context: Context): Node | undefined {
        // Get the scope of the left and right and only return it if it's the same.
        // Otherwise, there is no overlapping scope.
        const leftScope = this.left.getScope(context);
        const rightScope = this.right.getScope(context);
        return leftScope === rightScope ? leftScope : undefined;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.UnionType;
    }

    /**
     * Given a list of types, remove all duplicates, and if only one remains, return it.
     * Otherwise, create a union type that contains all of the unique types. Returns a NeverType if the set is empty.
     */
    static getPossibleUnion(context: Context, types: Type[]): Type {
        if (types.length === 0) return new NeverType();

        // Flatten the list of types.
        let all: Type[] = [];
        for (const type of types)
            all = [...all, ...type.getPossibleTypes(context)];

        // Find the unique types in the list.
        const uniqueTypes: Type[] = [];
        all.forEach((type) => {
            if (
                uniqueTypes.length === 0 ||
                uniqueTypes.every((t) => !t.accepts(type, context))
            )
                uniqueTypes.push(type);
        });

        // If there's just one, return it.
        if (uniqueTypes.length === 1) return uniqueTypes[0];

        // Otherwise construct a union type of all of them.
        let union = uniqueTypes[0];
        do {
            uniqueTypes.shift();
            if (uniqueTypes.length > 0)
                union = UnionType.make(union, uniqueTypes[0]);
        } while (uniqueTypes.length > 0);
        return union;
    }

    getGlyphs() {
        return Glyphs.Union;
    }

    getDescriptionInputs(locale: Locale, context: Context) {
        return [
            new NodeRef(this.left, locale, context),
            new NodeRef(this.right, locale, context),
        ];
    }

    generalize(context: Context): Type {
        // First, generalize all of the types in the union.
        const generalized = this.getPossibleTypes(context).map((type) =>
            type.generalize(context)
        );

        // Next, find the smallest subset of types to represent the set.
        // We do this by iterating through each time, and removing other types that it accepts.
        const remaining: Set<Type> = new Set(generalized);
        for (const type1 of remaining) {
            for (const type2 of remaining) {
                if (type1 !== type2 && type1.accepts(type2, context))
                    remaining.delete(type2);
            }
        }

        if (remaining.size === 0) return Array.from(remaining)[0];
        else return UnionType.getPossibleUnion(context, Array.from(remaining));
    }
}
