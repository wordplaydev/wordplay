import type Project from '@db/projects/Project';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type { Form } from '@output/Output/Shape/Form';
import { toRectangle } from '@output/Output/Shape/Rectangle';
import { toCircle } from '@output/Output/Shape/Circle';
import { toPath } from '@output/Output/Shape/Path';
import { toPolygon } from '@output/Output/Shape/Polygon';

/** Turn a shape structure value into its matching {@link Form} wrapper, dispatching by type. */
export function toForm(
    project: Project,
    value: Value | undefined,
): Form | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    if (value.is(project.shares.output.Rectangle)) return toRectangle(value);
    else if (value.is(project.shares.output.Circle)) return toCircle(value);
    else if (value.is(project.shares.output.Polygon)) return toPolygon(value);
    else if (value.is(project.shares.output.Path)) return toPath(value);
    else return undefined;
}
