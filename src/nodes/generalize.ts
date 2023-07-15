import type Context from './Context';
import ListType from './ListType';
import NumberType from './NumberType';
import TextType from './TextType';
import type Type from './Type';
import UnionType from './UnionType';
import Unit from './Unit';

export default function generalize(types: Type, context: Context) {
    // Are all of the types in the union list types? If so, collapse them into a single list type.
    if (types instanceof UnionType) {
        const possible = types.getPossibleTypes(context);
        // All text of the same language? Generalize to text.
        if (
            possible.every(
                (type) =>
                    type instanceof TextType &&
                    possible.every(
                        (type2) =>
                            type === type2 ||
                            (type instanceof TextType &&
                                type2 instanceof TextType &&
                                ((type.format === undefined &&
                                    type2.format === undefined) ||
                                    (type.format !== undefined &&
                                        type2.format !== undefined &&
                                        type.format.isEqualTo(type2.format))))
                    )
            )
        )
            types = TextType.make((possible[0] as TextType).format);
        // All numbers with equivalent units? Generalize to a number with the unit.
        else if (possible.every((type) => type instanceof NumberType)) {
            const first = possible[0];
            if (first instanceof NumberType) {
                if (
                    possible.every(
                        (type) =>
                            type instanceof NumberType &&
                            type.unit instanceof Unit &&
                            first.unit instanceof Unit &&
                            type.unit.isEqualTo(first.unit)
                    )
                )
                    types = NumberType.make(first.unit);
            }
        } else if (possible.every((type) => type instanceof ListType)) {
            types = ListType.make(
                UnionType.getPossibleUnion(
                    context,
                    (possible as ListType[]).reduce(
                        (all: Type[], type) =>
                            type.type ? [...all, type.type] : all,
                        []
                    )
                )
            );
        }
    } else if (types instanceof TextType) types = TextType.make();
    else if (types instanceof NumberType) types = NumberType.make();

    return types;
}
