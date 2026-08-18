import Setting from '@db/settings/Setting';

/**
 * A multiplier on the app's base font size rather than an absolute size, so the
 * caption tracks any future change to that base and so the numbers mean the
 * same thing on a phone and on a projector. The chooser's order, and the order
 * the locale's `labels`/`tips` tuples must match.
 *
 * The low end stops at ¾ rather than ½: this is a caption for someone who
 * cannot hear what it says, and a size too small to read is not a smaller
 * caption, it is no caption. The high end stops at 3× because the floor band
 * caps the box at a fraction of the stage anyway, so larger only means more of
 * the text is cut.
 */
export const CaptionSizes: number[] = [0.75, 1, 1.5, 2, 3];

/** In `CaptionSizes` order. Bare scale factors, matching the animation speed
 *  chooser, since a size has no icon that isn't just a bigger letter. */
export const CaptionSizeIcons = ['¾', '1x', '1½', '2x', '3x'];

/**
 * How large `Say` captions are drawn.
 *
 * Device-local: how big text needs to be is a fact about the screen someone is
 * sitting in front of and how far away they are, not about who they are. The
 * same person on a classroom projector and on a phone wants different numbers,
 * and syncing one over the other would be a regression for whichever machine
 * lost.
 */
export const CaptionSizeSetting = new Setting<number>(
    'captionSize',
    true,
    1,
    // Clamped rather than rejected, so a value written by a future release with
    // more steps degrades to the nearest supported size instead of snapping
    // back to the default — the forgiveness `MusicVolumeSetting` shows.
    (value) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
            ? Math.min(3, Math.max(0.75, value))
            : 1,
    (current, value) => current === value,
);
