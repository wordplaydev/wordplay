import type Context from './Context';
import type Type from './Type';

/**
 * Utility class for reasoning about sets of types. Guarantees that any given pair of types in the set
 * are not compatible.
 */

export default class TypeSet {
    readonly set = new Set<Type>();

    constructor(types: Type[], context: Context) {
        // Remove any duplicates.
        for (const type of types)
            if (
                Array.from(this.set).find((t) => t.accepts(type, context)) ===
                undefined
            )
                this.set.add(type);
    }

    size() {
        return this.set.size;
    }

    list() {
        return Array.from(this.set);
    }

    contains(type: Type, context: Context): boolean {
        return this.list().some((t) => t.accepts(type, context));
    }

    containsAll(types: TypeSet, context: Context): boolean {
        return types.list().every((t) => this.contains(t, context));
    }

    acceptedBy(type: Type, context: Context): boolean {
        return this.list().some((t) => type.accepts(t, context));
    }

    union(set: TypeSet, context: Context) {
        return new TypeSet([...this.list(), ...set.list()], context);
    }

    difference(set: TypeSet, context: Context) {
        return new TypeSet(
            this.list().filter(
                (thisType) =>
                    set
                        .list()
                        .find((thatType) =>
                            thatType.accepts(thisType, context)
                        ) === undefined
            ),
            context
        );
    }

    intersection(set: TypeSet, context: Context) {
        return new TypeSet(
            this.list().filter(
                (thisType) =>
                    set
                        .list()
                        .find((thatType) =>
                            thatType.accepts(thisType, context)
                        ) !== undefined
            ),
            context
        );
    }
}
