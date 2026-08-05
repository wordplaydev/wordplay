import { FOCAL_LENGTH, PX_PER_METER } from '@output/Output/outputToCSS';

/**
 * The focus that renders output at its natural size — one metre to `PX_PER_METER`
 * pixels, no magnification — since `rootScale` is `FOCAL_LENGTH / (0 - z)`.
 */
export const NaturalSizeZ = -FOCAL_LENGTH;

/**
 * Solve for the focus z that fits content of the given size (in metres) into the
 * available screen space (in pixels), leaving the content as large as it can be without
 * clipping. Returns undefined when there's no space to fit into — a viewport whose size
 * isn't known yet would otherwise divide by zero and produce z = -Infinity, which scales
 * all output to nothing.
 */
export default function fitZ(
    contentWidth: number,
    contentHeight: number,
    availableWidth: number,
    availableHeight: number,
): number | undefined {
    if (availableWidth <= 0 || availableHeight <= 0) return undefined;

    // Content with no extent at all — an empty phrase measures exactly 0×0 — can't be
    // framed. Fitting it solved to z = 0, which put the camera in the output's own plane,
    // and output only draws in front of the focus (`place.z > focus.z` in PhraseView), so
    // the stage rendered blank. Framing some minimum box instead only trades that for the
    // opposite problem, because the fit scale is `available / content`: the smaller the
    // box, the more it magnifies, and whatever placeholder the view paints then fills the
    // stage. With nothing to frame there is nothing to magnify, so don't — render at
    // natural size and let the placeholder read as the small, empty thing it is.
    if (contentWidth === 0 && contentHeight === 0) return NaturalSizeZ;

    // Fit the dimension whose scale would be smaller, so nothing is clipped. A single
    // zero dimension divides to Infinity here and loses the comparison, which is correct:
    // the axis that has extent is the one to frame by.
    const horizontal =
        availableWidth / (contentWidth * PX_PER_METER) <
        availableHeight / (contentHeight * PX_PER_METER);

    return (
        -(
            (horizontal ? contentWidth : contentHeight) *
            PX_PER_METER *
            FOCAL_LENGTH
        ) / (horizontal ? availableWidth : availableHeight)
    );
}
