import type Project from '#db/projects/Project.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import type { Form } from '#output/Output/Shape/Form.ts';
import { toRectangle } from '#output/Output/Shape/Rectangle.ts';
import { toCircle } from '#output/Output/Shape/Circle.ts';
import { toPath } from '#output/Output/Shape/Path.ts';
import { toPolygon } from '#output/Output/Shape/Polygon.ts';

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
