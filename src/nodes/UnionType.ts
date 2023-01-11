import type ConversionDefinition from './ConversionDefinition';
import type FunctionDefinition from './FunctionDefinition';
import type Context from './Context';
import Token from './Token';
import type Node from './Node';
import TokenType from './TokenType';
import Type from './Type';
import { OR_SYMBOL } from '../parser/Symbols';
import type TypeSet from './TypeSet';
import NeverType from './NeverType';
import type { NativeTypeName } from '../native/NativeConstants';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';

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
        return new UnionType(
            left,
            new Token(OR_SYMBOL, TokenType.UNION),
            right
        );
    }

    getGrammar() {
        return [
            { name: 'left', types: [Type] },
            { name: 'or', types: [Token] },
            { name: 'right', types: [Type] },
        ];
    }

    clone(replace?: Replacement) {
        return new UnionType(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('or', this.or, replace),
            this.replaceChild('right', this.right, replace)
        ) as this;
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
    getPossibleTypes(): Type[] {
        return [
            ...this.left.getPossibleTypes(),
            ...this.right.getPossibleTypes(),
        ];
    }

    containsType(type: Type, context: Context) {
        return (
            this.left.accepts(type, context) ||
            !(this.right instanceof Type) ||
            this.right.accepts(type, context)
        );
    }

    /** Override the native conversion search to check both types */
    getConversion(
        context: Context,
        input: Type,
        output: Type
    ): ConversionDefinition | undefined {
        const left = context.native.getConversion(
            this.left.getNativeTypeName(),
            context,
            input,
            output
        );
        if (left !== undefined) return left;
        return this.right instanceof Type
            ? context.native.getConversion(
                  this.right.getNativeTypeName(),
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
        const left = context.native.getFunction(
            this.left.getNativeTypeName(),
            name
        );
        if (left !== undefined) return left;
        return this.right instanceof Type
            ? context.native.getFunction(this.right.getNativeTypeName(), name)
            : undefined;
    }

    getNativeTypeName(): NativeTypeName {
        return 'union';
    }

    computeConflicts() {}

    /** Override the base class: native type scopes are their native structure definitions. */
    getScope(context: Context): Node | undefined {
        // Get the scope of the left and right and only return it if it's the same.
        // Otherwise, there is no overlapping scope.
        const leftScope = this.left.getScope(context);
        const rightScope = this.right.getScope(context);
        return leftScope === rightScope ? leftScope : undefined;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.UnionType;
    }

    /**
     * Given a list of types, remove all duplicates, and if only one remains, return it.
     * Otherwise, create a union type that contains all of the unique types. Returns a NeverType if the set is empty.
     */
    static getPossibleUnion(context: Context, types: Type[]): Type {
        if (types.length === 0) return new NeverType();

        // Flatten the list of types.
        let all: Type[] = [];
        for (const type of types) all = [...all, ...type.getPossibleTypes()];

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
}
