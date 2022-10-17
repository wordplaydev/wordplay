import BooleanType from "./BooleanType";
import ListType from "./ListType";
import MapType from "./MapType";
import MeasurementType from "./MeasurementType";
import SetType from "./SetType";
import TextType from "./TextType";
import TypePlaceholder from "./TypePlaceholder";
import type Node from "./Node";
import StructureDefinition from "./StructureDefinition";
import NameType from "./NameType";
import type Context from "./Context";
import { getPossibleLanguages } from "./getPossibleLanguages";
import Language from "./Language";
import { getPossibleUnits } from "./getPossibleUnits";
import Reference from "./Reference";
import type Transform from "./Transform"

export function getPossibleTypes(node: Node, context: Context): Transform[] {

    const project = context.source.getProject();

    return [
        new BooleanType(),
        ...[ new MeasurementType(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => new MeasurementType(undefined, u))) ],
        ...[ new TextType(), ... (project === undefined ? [] : getPossibleLanguages(project).map(l => new TextType(undefined, new Language(l)))) ],
        new ListType(new TypePlaceholder()),
        new SetType(new TypePlaceholder()),
        new MapType(new TypePlaceholder(), new TypePlaceholder()),
        // Any structure definition types that match the  aren't the currently selected one.
        ... (node.getAllDefinitions(node, context)
            .filter(def => def instanceof StructureDefinition) as StructureDefinition[])
            .map(s => new Reference<NameType>(s, name => new NameType(name)))
    ]

}