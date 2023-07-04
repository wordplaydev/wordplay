import type Context from './Context';
import ListType from './ListType';
import MeasurementType from './MeasurementType';
import TextType from './TextType';
import type Type from './Type';
import UnionType from './UnionType';

export default function generalize(types: Type, context: Context) {
    // Are all of the types in the union list types? If so, collapse them into a single list type.
    if (types instanceof UnionType) {
        const possible = types.getPossibleTypes(context);
        if (possible.every((type) => type instanceof TextType))
            types = TextType.make();
        else if (possible.every((type) => type instanceof MeasurementType))
            types = MeasurementType.make();
        else if (possible.every((type) => type instanceof ListType)) {
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
    else if (types instanceof MeasurementType) types = MeasurementType.make();

    return types;
}
