import type Project from "../models/Project";
import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import MeasurementType from "../nodes/MeasurementType";
import Unit from "../nodes/Unit";

export function getPossibleUnits(project: Project) {

    const unitsInConversions = getUnitsInConversions(project);

    const unitsInProject = project.getSources()
        .reduce((units: Unit[], source) => [ ... units, ... source.program.getUnitsUsed() ], []);

    // Return unique units
    return [ ... unitsInConversions, ... unitsInProject ]
        .filter((unit, i1, units) => units.find((unit2, i2) => unit !== unit2 && i2 > i1 && unit.toWordplay() === unit2.toWordplay()) === undefined);
        
}

function getUnitsInConversions(project: Project) {

    // Get all dimensions referred to in conversions.
    const unitsInConversions = project.getContext().native
        ?.getStructureDefinition(MEASUREMENT_NATIVE_TYPE_NAME)
        ?.getAllConversions()
        .map(conversion => conversion.output instanceof MeasurementType && conversion.output.unit instanceof Unit ? conversion.output.unit : undefined)
        .filter( unit => unit !== undefined) as Unit[];

    // Remove duplicates
    return  unitsInConversions.filter((unit, i1, units) => units.find((unit2, i2) => unit !== unit2 && i2 > i1 && unit.toWordplay() === unit2.toWordplay()) === undefined)

}

export function getPossibleDimensions(project: Project) {

    const dimensionsInConversions = 
            getUnitsInConversions(project)
            .reduce((dimensions: string[], unit) => [ ...dimensions, ...unit.numerator.map(dim => dim.getName()), ...unit.denominator.map(dim => dim.getName()) ], []);
    
    // Get all dimensions referred to in programs.
    const dimensionsInPrograms = project.getSources()
            .reduce((dimensions: string[], source) => [ ... dimensions, ... source.program.getDimensionsUsed().map(dim => dim.getName()) ], [])

    // Return unique dimensions
    return Array.from(new Set([ ... dimensionsInConversions, ... dimensionsInPrograms ]));

}