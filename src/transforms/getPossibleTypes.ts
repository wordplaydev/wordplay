import BooleanType from "../nodes/BooleanType";
import ListType from "../nodes/ListType";
import MapType from "../nodes/MapType";
import MeasurementType from "../nodes/MeasurementType";
import SetType from "../nodes/SetType";
import TextType from "../nodes/TextType";
import TypePlaceholder from "../nodes/TypePlaceholder";
import type Node from "../nodes/Node";
import StructureDefinition from "../nodes/StructureDefinition";
import type Context from "../nodes/Context";
import Language from "../nodes/Language";
import type Type from "../nodes/Type";
import StructureDefinitionType from "../nodes/StructureDefinitionType";
import NameType from "../nodes/NameType";
import Replace from "./Replace";
import Append from "./Append";
import Add from "./Add";
import { getPossibleLanguages } from "./getPossibleLanguages";
import { getPossibleUnits } from "./getPossibleUnits";
import { languages } from "../models/languages";
import { get } from "svelte/store";

export function getPossibleTypes(node: Node, context: Context): Type[] {

    const project = context.project;

    return [
        new BooleanType(),
        ...[ MeasurementType.make(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => MeasurementType.make(u))) ],
        ...[ TextType.make(), ... (project === undefined ? [] : getPossibleLanguages(project).map(l => TextType.make(Language.make(l)))) ],
        ListType.make(new TypePlaceholder()),
        SetType.make(new TypePlaceholder()),
        MapType.make(new TypePlaceholder(), new TypePlaceholder()),
        // Any structure definition types that match the aren't the currently selected one.
        ... (node.getAllDefinitions(node, context)
            .filter((def): def is StructureDefinition => def instanceof StructureDefinition))
            .map(s => new NameType(s.names.getTranslation(get(languages))))
    ]

}

export function getPossibleTypeReplacements(node: Node, context: Context): Replace<any>[] {

    return getPossibleTypes(node, context)
        .map(type => type instanceof StructureDefinitionType ? 
                new Replace<NameType>(context, node, [ (name: string) => new NameType(name), type.structure ]) :
                new Replace(context, node, type))

}

export function getPossibleTypeInsertions(parent: Node, position: number, list: Node[], child: Node | undefined, context: Context): Append<any>[] {

    return getPossibleTypes(parent, context)
        .map(type => type instanceof StructureDefinitionType ? 
                new Append(context, position, parent, list, child, [ name => new NameType(name), type.structure ]) :
                new Append(context, position, parent, list, child, type))

}

export function getPossibleTypeAdds(parent: Node, name: string, context: Context, position: number): Add<NameType | Type>[] {

    return getPossibleTypes(parent, context)
        .map(type => type instanceof StructureDefinitionType ? 
                new Add<NameType>(context, position, parent, name, [ name => new NameType(name), type.structure ]) :
                new Add<Type>(context, position, parent, name, type))

}