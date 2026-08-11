/**
 * Mapping from a detection model's normalized coordinates to pixels in the
 * sensor monitor's camera preview.
 *
 * Two things make this a plain scale rather than the object-fit: cover arithmetic
 * it looks like it should need. `CameraLandmarkStream` feeds the model a square
 * center-crop of the sensor (`CameraFeed` at resolution × resolution), so
 * landmarks are normalized to that square, not to the full frame. And the preview
 * is a square box showing the same video with object-fit: cover, which crops to
 * exactly that same center square. Model input and visible region are the same
 * rectangle, so normalized coordinates scale straight to preview pixels.
 *
 * The 1 - x mirrors horizontally, matching the selfie view the stage already
 * uses (`CameraLandmarkStream.toStageMeters` negates x for the same reason): a
 * creator positioning a hand in frame expects a mirror, and the dots have to
 * agree with where the stage puts them. Only the points are mirrored here — the
 * video is mirrored in CSS — so text drawn on the overlay stays readable.
 */

type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

/** Map a normalized landmark to mirrored preview pixels. */
export function toPreviewPoint(
    point: Point,
    width: number,
    height: number,
): Point {
    return { x: (1 - point.x) * width, y: point.y * height };
}

/**
 * Map a normalized detection box to mirrored preview pixels. Mirroring moves the
 * origin to what was the box's right edge, since the box is anchored top-left.
 */
export function toPreviewBox(box: Box, width: number, height: number): Box {
    return {
        x: (1 - (box.x + box.width)) * width,
        y: box.y * height,
        width: box.width * width,
        height: box.height * height,
    };
}
