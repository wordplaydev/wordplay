/* eslint-disable @typescript-eslint/no-unused-vars */
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import type ConversionDefinition from './ConversionDefinition';
import type Expression from './Expression';
import type FunctionDefinition from './FunctionDefinition';
import Node from './Node';
import TypeSet from './TypeSet';

export default abstract class Type extends Node {
    constructor() {
        super();
    }

    getPurpose() {
        return Purpose.Type;
    }

    /**
     * True if the given type can be bound to this type, in the given program context.
     * Gets all possible types of the given type, then asks the subclass to check them all.
     */
    accepts(type: Type, context: Context, expression?: Expression): boolean {
        return this.acceptsAll(
            new TypeSet(type.getPossibleTypes(context), context),
            context,
            expression,
        );
    }

    abstract acceptsAll(
        types: TypeSet,
        context: Context,
        expression?: Expression,
    ): boolean;

    abstract getBasisTypeName(): BasisTypeName;

    /** Subclasses can optionally resolve names. Mainly used to resolve name types into concrete structure types. */
    concretize(_: Context): Type {
        return this;
    }

    /** Subclasses override to abstract away from any literal types specified inside the type. */
    generalize(_: Context): Type {
        return this;
    }

    /** Subclasses override to strip away metadata, generating the simplest type possible. */
    simplify(_: Context): Type {
        return this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return this.getBasisTypeName();
    }

    /**
     * All types can only be themeselves, unless otherwise noted (primarily the case for UnionTypes).
     * We use this as a generic interface to ensure we're always accounting for the many types a type can be,
     * and to allow for extensions to the type system later.
     */
    getPossibleTypes(_: Context): Type[] {
        return [this];
    }

    getTypeSet(context: Context): TypeSet {
        return new TypeSet(this.getPossibleTypes(context), context);
    }

    /** All types are concrete unless noted otherwise. */
    isGeneric() {
        return false;
    }

    getConversion(
        context: Context,
        input: Type,
        output: Type,
    ): ConversionDefinition | undefined {
        return context
            .getBasis()
            .getConversion(this.getBasisTypeName(), context, input, output);
    }

    getAllConversions(context: Context) {
        return context.getBasis() === undefined
            ? []
            : context.getBasis().getAllConversions();
    }

    getFunction(
        context: Context,
        name: string,
    ): FunctionDefinition | undefined {
        return context.getBasis().getFunction(this.getBasisTypeName(), name);
    }

    resolveTypeVariable(_: string, __: Context): Type | undefined {
        return undefined;
    }

    /** Return a reasonable default expression for the type, if one exists. Subclasses can override. */
    getDefaultExpression(_: Context): Expression | undefined {
        return undefined;
    }
}
