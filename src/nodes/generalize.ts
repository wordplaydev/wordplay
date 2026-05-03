import type Context from '@nodes/Context';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';

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
                                ((type.language === undefined &&
                                    type2.language === undefined) ||
                                    (type.language !== undefined &&
                                        type2.language !== undefined &&
                                        type.language.isEqualTo(
                                            type2.language,
                                        )))),
                    ),
            )
        )
            types = TextType.make(
                undefined,
                (possible[0] as TextType).language,
            );
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
                            type.unit.isEqualTo(first.unit),
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
                        [],
                    ),
                ),
            );
        }
    }
    return types;
}
