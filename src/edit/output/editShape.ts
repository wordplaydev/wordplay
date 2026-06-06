import type Project from '@db/projects/Project';
import { getNumber } from '@components/palette/editOutput';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';

/**
 * Direct-manipulation of a Shape's form (Rectangle/Circle/Polygon) geometry. A Shape's position
 * and size come from its form's coordinates, so dragging translates the form's anchor and resizing
 * scales the form about its center. All functions bail (return undefined) when a needed coordinate
 * is a computed expression rather than a literal, so we never clobber an author's expression.
 */

type FormKind = 'rectangle' | 'circle' | 'polygon';

function formKind(
    project: Project,
    form: Evaluate,
    context: Context,
): FormKind | undefined {
    if (form.is(project.shares.output.Rectangle, context)) return 'rectangle';
    if (form.is(project.shares.output.Circle, context)) return 'circle';
    if (form.is(project.shares.output.Polygon, context)) return 'polygon';
    return undefined;
}

/** Read the numeric value of one of the form's inputs, or undefined if computed/missing. Falls back
 *  to the input's DEFAULT when it isn't explicitly given — e.g. Circle/Polygon `x`/`y` default to
 *  `0m`, so a `Polygon(4m 5)` with no explicit center still resolves to (0, 0) and can be moved
 *  (translateFormTo then adds the explicit binds). Bails (undefined) only when neither an explicit
 *  literal nor a literal default is available (e.g. a computed coordinate), so we never clobber an
 *  author's expression. */
function coord(
    form: Evaluate,
    index: number,
    project: Project,
    kind: FormKind,
    context: Context,
): number | undefined {
    const def =
        kind === 'rectangle'
            ? project.shares.output.Rectangle
            : kind === 'circle'
              ? project.shares.output.Circle
              : project.shares.output.Polygon;
    const bind = def.inputs[index];
    const given = form.getInput(bind, context);
    // Explicit value if provided, otherwise the bind's default expression (e.g. `0m`).
    const expression = given instanceof Expression ? given : bind.value;
    return expression instanceof Expression ? getNumber(expression) : undefined;
}

/** A meters number literal, rounded to 2 decimals to keep the source tidy. */
function m(value: number): NumberLiteral {
    return NumberLiteral.make(Math.round(value * 100) / 100, Unit.meters());
}

/** The indices of a form's positional coordinates: Rectangle's four edges, or a center (x, y). */
function positions(kind: FormKind): {
    rectangle?: [number, number, number, number];
    center?: [number, number];
} {
    return kind === 'rectangle'
        ? { rectangle: [0, 1, 2, 3] }
        : kind === 'circle'
          ? { center: [1, 2] }
          : { center: [2, 3] };
}

/** The form's bounding-box top-left anchor in stage meters (y-axis up-positive), if all literals. */
export function getFormAnchor(
    project: Project,
    form: Evaluate,
    context: Context,
): { x: number; y: number } | undefined {
    const kind = formKind(project, form, context);
    if (kind === undefined) return undefined;
    if (kind === 'rectangle') {
        const left = coord(form, 0, project, kind, context);
        const top = coord(form, 1, project, kind, context);
        const right = coord(form, 2, project, kind, context);
        const bottom = coord(form, 3, project, kind, context);
        if (
            left === undefined ||
            top === undefined ||
            right === undefined ||
            bottom === undefined
        )
            return undefined;
        return { x: Math.min(left, right), y: Math.max(top, bottom) };
    } else {
        const [xi, yi] = positions(kind).center!;
        const radius = coord(form, 0, project, kind, context);
        const x = coord(form, xi, project, kind, context);
        const y = coord(form, yi, project, kind, context);
        if (radius === undefined || x === undefined || y === undefined)
            return undefined;
        return { x: x - radius, y: y + radius };
    }
}

/** Return a copy of the form translated so its top-left anchor is at (anchorX, anchorY). */
export function translateFormTo(
    project: Project,
    form: Evaluate,
    context: Context,
    anchorX: number,
    anchorY: number,
): Evaluate | undefined {
    const kind = formKind(project, form, context);
    if (kind === undefined) return undefined;
    const anchor = getFormAnchor(project, form, context);
    if (anchor === undefined) return undefined;
    const dx = anchorX - anchor.x;
    const dy = anchorY - anchor.y;

    if (kind === 'rectangle') {
        const R = project.shares.output.Rectangle;
        const left = coord(form, 0, project, kind, context)!;
        const top = coord(form, 1, project, kind, context)!;
        const right = coord(form, 2, project, kind, context)!;
        const bottom = coord(form, 3, project, kind, context)!;
        return form
            .withBindAs(R.inputs[0], m(left + dx), context)
            .withBindAs(R.inputs[1], m(top + dy), context)
            .withBindAs(R.inputs[2], m(right + dx), context)
            .withBindAs(R.inputs[3], m(bottom + dy), context);
    } else {
        const def =
            kind === 'circle'
                ? project.shares.output.Circle
                : project.shares.output.Polygon;
        const [xi, yi] = positions(kind).center!;
        const x = coord(form, xi, project, kind, context)!;
        const y = coord(form, yi, project, kind, context)!;
        return form
            .withBindAs(def.inputs[xi], m(x + dx), context)
            .withBindAs(def.inputs[yi], m(y + dy), context);
    }
}

/** Return a copy of the form scaled by `ratio` about its center (size only; position fixed). */
export function scaleForm(
    project: Project,
    form: Evaluate,
    context: Context,
    ratio: number,
): Evaluate | undefined {
    const kind = formKind(project, form, context);
    if (kind === undefined) return undefined;

    if (kind === 'rectangle') {
        const R = project.shares.output.Rectangle;
        const left = coord(form, 0, project, kind, context);
        const top = coord(form, 1, project, kind, context);
        const right = coord(form, 2, project, kind, context);
        const bottom = coord(form, 3, project, kind, context);
        if (
            left === undefined ||
            top === undefined ||
            right === undefined ||
            bottom === undefined
        )
            return undefined;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        return form
            .withBindAs(R.inputs[0], m(cx + (left - cx) * ratio), context)
            .withBindAs(R.inputs[1], m(cy + (top - cy) * ratio), context)
            .withBindAs(R.inputs[2], m(cx + (right - cx) * ratio), context)
            .withBindAs(R.inputs[3], m(cy + (bottom - cy) * ratio), context);
    } else {
        const def =
            kind === 'circle'
                ? project.shares.output.Circle
                : project.shares.output.Polygon;
        const radius = coord(form, 0, project, kind, context);
        if (radius === undefined) return undefined;
        return form.withBindAs(
            def.inputs[0],
            m(Math.max(0.1, radius * ratio)),
            context,
        );
    }
}
