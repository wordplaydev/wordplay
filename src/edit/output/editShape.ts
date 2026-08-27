import type Project from '@db/projects/Project';
import { getNumber } from '@components/palette/editOutput';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import type Locales from '@locale/Locales';
import ListLiteral from '@nodes/ListLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import type Spread from '@nodes/Spread';
import Unit from '@nodes/Unit';

/**
 * Direct-manipulation of a Shape's form (Rectangle/Circle/Polygon/Path) geometry. A Shape's position
 * and size come from its form's coordinates, so dragging translates the form's anchor and resizing
 * scales the form about its center. All functions bail (return undefined) when a needed coordinate
 * is a computed expression rather than a literal, so we never clobber an author's expression.
 */

type FormKind = 'rectangle' | 'circle' | 'polygon' | 'path';

function formKind(
    project: Project,
    form: Evaluate,
    context: Context,
): FormKind | undefined {
    if (form.is(project.shares.output.Rectangle, context)) return 'rectangle';
    if (form.is(project.shares.output.Circle, context)) return 'circle';
    if (form.is(project.shares.output.Polygon, context)) return 'polygon';
    if (form.is(project.shares.output.Path, context)) return 'path';
    return undefined;
}

/**
 * A path's geometry is a list of places rather than a few numbers, so it can't go through
 * `coord`. Reading one gives up unless **every** point is a pair of literals: a path is one
 * shape, and translating half of it would tear it apart.
 */
function pathPoints(
    project: Project,
    form: Evaluate,
    context: Context,
): { list: ListLiteral; points: { x: number; y: number }[] } | undefined {
    const given = form.getInput(project.shares.output.Path.inputs[0], context);
    if (!(given instanceof ListLiteral)) return undefined;
    const points: { x: number; y: number }[] = [];
    for (const item of given.values) {
        if (!(item instanceof Evaluate)) return undefined;
        const [xExpression, yExpression] = item.inputs;
        if (
            !(xExpression instanceof Expression) ||
            !(yExpression instanceof Expression)
        )
            return undefined;
        const x = getNumber(xExpression);
        const y = getNumber(yExpression);
        if (x === undefined || y === undefined) return undefined;
        points.push({ x, y });
    }
    return { list: given, points };
}

/** A copy of the path with every point moved, keeping each place's other inputs (its z). */
function withMovedPoints(
    project: Project,
    form: Evaluate,
    context: Context,
    move: (point: { x: number; y: number }) => { x: number; y: number },
): Evaluate | undefined {
    const read = pathPoints(project, form, context);
    if (read === undefined) return undefined;
    const moved = ListLiteral.make(
        read.list.values.map((item, index) => {
            if (!(item instanceof Evaluate)) return item;
            const to = move(read.points[index]);
            const place = project.shares.output.Place;
            // withBindAs rather than rebuilding positionally, so a place written with named
            // inputs, or carrying a z, keeps what it had.
            return item
                .withBindAs(place.inputs[0], m(to.x), context)
                .withBindAs(place.inputs[1], m(to.y), context);
        }),
    );
    return form.withBindAs(
        project.shares.output.Path.inputs[0],
        moved,
        context,
    );
}

/**
 * The places a path passes through, for a view that edits them one at a time, or undefined if
 * any of them is computed rather than written down.
 */
export function getPathPoints(
    project: Project,
    form: Evaluate,
    context: Context,
): { x: number; y: number }[] | undefined {
    return pathPoints(project, form, context)?.points;
}

/** A Place expression, which is what every point of a path is. */
function place(
    project: Project,
    x: number,
    y: number,
    locales: Locales,
): Evaluate {
    return Evaluate.make(project.shares.output.Place.getReference(locales), [
        m(x),
        m(y),
    ]);
}

/** A copy of the path with its list of points replaced. */
function withPoints(
    project: Project,
    form: Evaluate,
    context: Context,
    values: (Expression | Spread)[],
): Evaluate {
    return form.withBindAs(
        project.shares.output.Path.inputs[0],
        ListLiteral.make(values),
        context,
    );
}

/** Move one of a path's points, keeping the rest of its place (its z) as written. */
export function withMovedPathPoint(
    project: Project,
    form: Evaluate,
    context: Context,
    index: number,
    to: { x: number; y: number },
): Evaluate | undefined {
    const read = pathPoints(project, form, context);
    const item = read?.list.values[index];
    if (read === undefined || !(item instanceof Evaluate)) return undefined;
    const placeType = project.shares.output.Place;
    const moved = item
        .withBindAs(placeType.inputs[0], m(to.x), context)
        .withBindAs(placeType.inputs[1], m(to.y), context);
    return withPoints(
        project,
        form,
        context,
        read.list.values.map((value, i) => (i === index ? moved : value)),
    );
}

/**
 * Add a point halfway along the span that leaves the given point, so detail can be added
 * without redrawing. The last point of an open path has no span after it, so it halves the one
 * before instead — which is what makes every point subdividable, the same rule the character
 * editor's paths follow. Returns the revised form and where the new point landed.
 */
export function withInsertedPathPoint(
    project: Project,
    form: Evaluate,
    context: Context,
    index: number,
    locales: Locales,
): { form: Evaluate; index: number } | undefined {
    const read = pathPoints(project, form, context);
    if (read === undefined || read.points.length < 2) return undefined;

    const after = index + 1 < read.points.length ? index + 1 : index;
    const from = read.points[after === index ? index - 1 : index];
    const to = read.points[after];
    if (from === undefined || to === undefined) return undefined;

    const at = after === index ? index : after;
    const midpoint = place(
        project,
        Math.round(((from.x + to.x) / 2) * 100) / 100,
        Math.round(((from.y + to.y) / 2) * 100) / 100,
        locales,
    );
    return {
        form: withPoints(project, form, context, [
            ...read.list.values.slice(0, at),
            midpoint,
            ...read.list.values.slice(at),
        ]),
        index: at,
    };
}

/**
 * Remove one of a path's points, or refuse when that would leave too few to draw a line with.
 * Refusing rather than deleting the whole shape: a path of one point is invisible but still
 * selectable, which reads as the editor having eaten it.
 */
export function withoutPathPoint(
    project: Project,
    form: Evaluate,
    context: Context,
    index: number,
): Evaluate | undefined {
    const read = pathPoints(project, form, context);
    if (read === undefined || read.list.values.length <= 2) return undefined;
    return withPoints(
        project,
        form,
        context,
        read.list.values.filter((_, i) => i !== index),
    );
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
    if (kind === 'path') {
        const read = pathPoints(project, form, context);
        if (read === undefined || read.points.length === 0) return undefined;
        // The points' own hull, not the drawn curve's: smoothing can bulge past it, but the
        // anchor only has to be a stable reference for a translation, and the points are what
        // a translation moves.
        return {
            x: Math.min(...read.points.map((point) => point.x)),
            y: Math.max(...read.points.map((point) => point.y)),
        };
    }
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

    if (kind === 'path')
        return withMovedPoints(project, form, context, (point) => ({
            x: point.x + dx,
            y: point.y + dy,
        }));

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

    if (kind === 'path') {
        const read = pathPoints(project, form, context);
        if (read === undefined || read.points.length === 0) return undefined;
        const xs = read.points.map((point) => point.x);
        const ys = read.points.map((point) => point.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        return withMovedPoints(project, form, context, (point) => ({
            x: cx + (point.x - cx) * ratio,
            y: cy + (point.y - cy) * ratio,
        }));
    }

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
