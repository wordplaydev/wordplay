import type ConversionDefinition from './ConversionDefinition';
import type FunctionDefinition from './FunctionDefinition';
import Node from './Node';
import type Context from './Context';
import type Expression from './Expression';
import TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import Purpose from '../concepts/Purpose';

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
            expression
        );
    }

    abstract acceptsAll(
        types: TypeSet,
        context: Context,
        expression?: Expression
    ): boolean;

    abstract getNativeTypeName(): NativeTypeName;

    /** Subclasses override to abstract away from any specific types specified inside the type. */
    generalize(_: Context): Type {
        return this;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return this.getNativeTypeName();
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
        output: Type
    ): ConversionDefinition | undefined {
        return context.native.getConversion(
            this.getNativeTypeName(),
            context,
            input,
            output
        );
    }

    getAllConversions(context: Context) {
        return context.native === undefined
            ? []
            : context.native.getAllConversions();
    }

    getFunction(
        context: Context,
        name: string
    ): FunctionDefinition | undefined {
        return context.native.getFunction(this.getNativeTypeName(), name);
    }

    resolveTypeVariable(_: string, __: Context): Type | undefined {
        return undefined;
    }
}
