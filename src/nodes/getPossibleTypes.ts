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
import Type from "./Type";
import { getPossibleLanguages } from "./getPossibleLanguages";
import Language from "./Language";
import { getPossibleUnits } from "./getPossibleUnits";

export function getPossibleTypes(parent: Node, child: Node, context: Context) {

    const project = context.source.getProject();

    return [
        new BooleanType(),
        ...[ new MeasurementType(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => new MeasurementType(undefined, u))) ],
        ...[ new TextType(), ... (project === undefined ? [] :getPossibleLanguages(project).map(l => new TextType(undefined, new Language(l)))) ],
        new ListType(new TypePlaceholder()),
        new SetType(undefined, undefined, new TypePlaceholder()),
        new MapType(undefined, undefined, new TypePlaceholder(), undefined, new TypePlaceholder()),
        // Any structure definition types that aren't the currently selected one.
        ... (parent.getAllDefinitions(parent, context)
            .filter(def => def instanceof StructureDefinition) as StructureDefinition[])
            .map(s => s.getNames().length > 0 ? new NameType(s.getNames()[0]) : undefined)
            .filter(n => n !== undefined && child instanceof Type && !child.accepts(n, context)) as NameType[]
    ]

}