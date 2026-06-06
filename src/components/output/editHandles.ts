import type Project from '@db/projects/Project';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import { scaleForm } from '@edit/output/editShape';

/**
 * Type-dispatched revisions for on-stage rotate/resize handles, shared by the continuous drag
 * (OutputView) and the discrete keyboard steps (OutputHandles) so there's one source of truth for
 * which bind each output type writes. Each returns the revised output Evaluate (the caller passes it
 * to Projects.revise), or undefined when the output type/value can't be manipulated.
 */

/** The rotation bind (in degrees) for an output, by type. */
function rotationBind(project: Project, output: Evaluate, context: Context) {
    if (output.is(project.shares.output.Phrase, context))
        return project.shares.output.Phrase.inputs[11];
    if (output.is(project.shares.output.Group, context))
        return project.shares.output.Group.inputs[12];
    if (output.is(project.shares.output.Shape, context))
        return project.shares.output.Shape.inputs[8];
    return undefined;
}

/** Return the output rotated to `degrees`, or undefined if it has no rotation bind. */
export function rotatedOutput(
    project: Project,
    output: Evaluate,
    context: Context,
    degrees: number,
): Evaluate | undefined {
    const bind = rotationBind(project, output, context);
    if (bind === undefined) return undefined;
    const rounded = Math.round(((degrees % 360) + 360) % 360);
    return output.withBindAs(
        bind,
        NumberLiteral.make(rounded, Unit.create(['°'])),
        context,
    );
}

/**
 * Return the output resized by `ratio`:
 * - Shape: scale the form's geometry about its center (Rectangle width/height, Circle/Polygon
 *   radius) — `ratio` is the incremental per-frame factor, so the current form is scaled.
 * - Phrase: set absolute size in meters = `startSize * ratio`.
 * - Group: set the scale multiplier = `startSize * ratio`.
 * Returns undefined when the output can't be resized (or a Shape's form is computed).
 */
export function resizedOutput(
    project: Project,
    output: Evaluate,
    context: Context,
    ratio: number,
    startSize: number,
): Evaluate | undefined {
    const Shape = project.shares.output.Shape;
    if (output.is(Shape, context)) {
        const form = output.getInput(Shape.inputs[0], context);
        if (!(form instanceof Evaluate)) return undefined;
        const newForm = scaleForm(project, form, context, ratio);
        return newForm
            ? output.withBindAs(Shape.inputs[0], newForm, context)
            : undefined;
    }
    const bind = output.is(project.shares.output.Phrase, context)
        ? project.shares.output.Phrase.inputs[1]
        : output.is(project.shares.output.Group, context)
          ? project.shares.output.Group.inputs[13]
          : undefined;
    if (bind === undefined) return undefined;
    const unit = output.is(project.shares.output.Phrase, context)
        ? Unit.meters()
        : undefined;
    const value = Math.max(0.1, Math.round(startSize * ratio * 10) / 10);
    return output.withBindAs(bind, NumberLiteral.make(value, unit), context);
}

/** Whether a resize of this output is incremental (a Shape, whose form is scaled per frame) and so
 *  needs the drag's reference distance advanced each frame, vs. absolute (Phrase/Group). */
export function resizeIsIncremental(
    project: Project,
    output: Evaluate,
    context: Context,
) {
    return output.is(project.shares.output.Shape, context);
}
