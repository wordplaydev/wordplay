import type Color from '@output/Color/Color';

/**
 * Paint a grid of colors onto a canvas at one pixel per color, for CSS to scale up.
 *
 * Never adapted to a dark canvas, unlike every other color on stage. Adapting inverts
 * lightness, which keeps a designed palette's contrasts but turns a photograph into its
 * negative: a picture's colors are what it is *of*, not a scheme to re-light. Shared by
 * the stage and the source's tile toggle so that rule is stated once and the two can't
 * drift into drawing the same picture differently.
 */
export default function paintColors(
    canvas: HTMLCanvasElement,
    grid: readonly (readonly Color[])[],
) {
    const context = canvas.getContext('2d');
    if (context === null) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const [y, row] of grid.entries())
        for (const [x, color] of row.entries()) {
            context.fillStyle = color.toCSS(false);
            context.fillRect(x, y, 1, 1);
        }
}
