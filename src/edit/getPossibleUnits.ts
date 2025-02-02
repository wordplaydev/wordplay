import type Project from '../db/projects/Project';
import NumberType from '@nodes/NumberType';
import Unit from '@nodes/Unit';
import Dimension from '../nodes/Dimension';
import type Context from '../nodes/Context';

export function getPossibleUnits(context: Context) {
    const project = context.project;
    const unitsInConversions = getUnitsInConversions(project);

    const unitsInProject = project
        .getSources()
        .reduce(
            (units: Unit[], source) => [
                ...units,
                ...source.expression.getUnitsUsed(),
            ],
            [],
        );

    const unitsInShares = context
        .getBasis()
        .shares.all.map((def) =>
            def.nodes().filter((d): d is Unit => d instanceof Unit),
        )
        .flat();

    // Return unique units
    return [...unitsInConversions, ...unitsInProject, ...unitsInShares].filter(
        (unit, i1, units) =>
            units.find(
                (unit2, i2) =>
                    unit !== unit2 &&
                    i2 > i1 &&
                    unit.toWordplay() === unit2.toWordplay(),
            ) === undefined,
    );
}

function getUnitsInConversions(project: Project) {
    // Get all dimensions referred to in conversions.
    const unitsInConversions = project
        .getBasis()
        .getStructureDefinition('measurement')
        ?.getAllConversions()
        .map((conversion) =>
            conversion.output instanceof NumberType &&
            conversion.output.unit instanceof Unit
                ? conversion.output.unit
                : undefined,
        )
        .filter((unit): unit is Unit => unit !== undefined) as Unit[];

    // Remove duplicates
    return unitsInConversions.filter(
        (unit, i1, units) =>
            units.find(
                (unit2, i2) =>
                    unit !== unit2 &&
                    i2 > i1 &&
                    unit.toWordplay() === unit2.toWordplay(),
            ) === undefined,
    );
}

export function getPossibleDimensions(context: Context) {
    const project = context.project;
    const dimensionsInConversions = getUnitsInConversions(project).reduce(
        (dimensions: string[], unit) => [
            ...dimensions,
            ...unit.numerator
                .map((dim) => dim.getName())
                .filter((dim): dim is string => dim !== undefined),
            ...unit.denominator
                .map((dim) => dim.getName())
                .filter((dim): dim is string => dim !== undefined),
        ],
        [],
    );

    // Get all dimensions referred to in programs.
    const dimensionsInPrograms = project.getSources().reduce(
        (dimensions: string[], source) => [
            ...dimensions,
            ...source.expression
                .getDimensionsUsed()
                .map((dim) => dim.getName())
                .filter((dim): dim is string => dim !== undefined),
        ],
        [],
    );

    // Get all dimensions in default shares
    const dimensionsInShares = project.shares.all.reduce(
        (dims: string[], def) => [
            ...dims,
            ...def
                .nodes()
                .filter((d): d is Dimension => d instanceof Dimension)
                .map((d) => d.getName())
                .filter((d): d is string => d !== undefined),
        ],
        [],
    );

    // Return unique dimensions
    return Array.from(
        new Set([
            ...dimensionsInConversions,
            ...dimensionsInPrograms,
            ...dimensionsInShares,
        ]),
    );
}
