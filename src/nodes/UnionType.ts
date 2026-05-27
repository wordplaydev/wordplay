import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import type { ReplaceContext } from '@edit/revision/EditContext';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Definition from '@nodes/Definition';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Markup from '@nodes/Markup';
import NeverType from '@nodes/NeverType';
import type Node from '@nodes/Node';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import NoneType from '@nodes/NoneType';
import { Sym } from '@nodes/Sym';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type TypeSet from '@nodes/TypeSet';
import { OR_SYMBOL } from '@parser/Symbols';
import Characters from '../lore/BasisCharacters';

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

    static getPossibleReplacements({ node }: ReplaceContext) {
        return node instanceof Type
            ? [UnionType.make(node, TypePlaceholder.make())]
            : [];
    }

    static getPossibleInsertions() {
        return [UnionType.make(TypePlaceholder.make(), TypePlaceholder.make())];
    }

    static orNone(left: Type) {
        return this.make(left, NoneType.make());
    }

    getDescriptor(): NodeDescriptor {
        return 'UnionType';
    }

    getPurpose() {
        return Purpose.Types;
    }

    getGrammar(): Grammar {
        return [
            { name: 'left', kind: node(Type), label: () => (l) => l.term.type },
            {
                name: 'or',
                kind: node(Sym.Union),
                label: undefined,
            },
            {
                name: 'right',
                kind: node(Type),
                label: () => (l) => l.term.type,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new UnionType(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('or', this.or, replace),
            this.replaceChild('right', this.right, replace),
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
        output: Type,
    ): ConversionDefinition | undefined {
        const left = context
            .getBasis()
            .getConversion(
                this.left.getBasisTypeName(),
                context,
                input,
                output,
            );
        if (left !== undefined) return left;
        return this.right instanceof Type
            ? context
                  .getBasis()
                  .getConversion(
                      this.right.getBasisTypeName(),
                      context,
                      input,
                      output,
                  )
            : undefined;
    }

    getFunction(
        context: Context,
        name: string,
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

    getDefinitionsInScope(context: Context): Definition[] {
        return this.getDefinitions(this, context);
    }

    /**
     * Override to search for definitions on both the left and right types, and
     * find the intersection of both sets, to allow for a degree of polymorphism. */
    getDefinitions(anchor: Node, context: Context): Definition[] {
        // Find the list of definitions in scope of each possible type.
        // We generalize because literal types don't affect available definitions.
        const definitionSets = this.generalize(context)
            .getPossibleTypes(context)
            .map((type) => type.getDefinitions(anchor, context));

        // Find the definitions that intersect across each type's definition list.
        // Do this by filtering the first set by all definitions for which all other sets have an equivalent definition.
        // This is what allows for polymorphism.
        const first = definitionSets[0];
        const rest = definitionSets.slice(1);
        return rest.length == 0
            ? first
            : first.filter((def1) =>
                  rest.every((definitions) =>
                      definitions.some((def2) => def1.isEquivalentTo(def2)),
                  ),
              );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.UnionType;
    getLocalePath() {
        return UnionType.LocalePath;
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

    getCharacter() {
        return Characters.Union;
    }

    /**
     * Returns the union with any locale-tagged TextTypes whose language
     * doesn't match the user's preferred locales filtered out. Used for rendering
     * conflicts and resolution options for localized basis APIs (e.g. easing names),
     * so users only see options in their own language. Falls back to the unfiltered
     * list if filtering would leave nothing.
     */
    getLocalizedTypes(locales: Locales, context: Context): Type[] {
        const all = this.getPossibleTypes(context);
        const preferred = locales.getLanguages();
        const filtered = all.filter((type) => {
            if (type instanceof TextType && type.language !== undefined) {
                const code = type.language.getLanguageCode();
                return code === undefined || preferred.includes(code);
            }
            return true;
        });
        return filtered.length === 0 ? all : filtered;
    }

    /**
     * Render the union as "one of A, B, ..., Y, or Z" using the locale's
     * binary "$1 ... $2" description template. We split the filtered arms so
     * $1 receives the comma-joined head and $2 receives the last arm. For
     * three or more arms we add a trailing comma to the head so the en-US
     * template "one of $1 or $2" produces the Oxford-comma form
     * "one of A, B, C, or D"; with two arms the head is bare so we get
     * "one of A or B". Non-English locales whose templates are shaped like
     * "$1 or $2" degrade gracefully (e.g., "A, B, C, o D" in Spanish).
     */
    getDescription(locales: Locales, context: Context): Markup {
        const filtered = this.getLocalizedTypes(locales, context);
        if (filtered.length === 1)
            return filtered[0].getDescription(locales, context);
        const headArms = filtered.slice(0, -1);
        const last = filtered[filtered.length - 1];
        const headText = headArms
            .map((arm) => arm.getDescription(locales, context).toText())
            .join(', ');
        const head = filtered.length >= 3 ? `${headText},` : headText;
        const tail = last.getDescription(locales, context).toText();
        return locales.concretize(
            (l) => l.node.UnionType.description,
            {
                first: head,
                second: tail,
            },
        );
    }

    concretize(context: Context) {
        return UnionType.make(
            this.left.concretize(context),
            this.right.concretize(context),
        );
    }

    generalize(context: Context): Type {
        // First, generalize all of the types in the union.
        const generalized = this.getPossibleTypes(context).map((type) =>
            type.generalize(context),
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

    getDefaultExpression(context: Context) {
        return (
            this.left.getDefaultExpression(context) ??
            this.right.getDefaultExpression(context)
        );
    }
}
