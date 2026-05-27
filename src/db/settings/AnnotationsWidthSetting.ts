import Setting from '@db/settings/Setting';

/** Minimum sidebar width in CSS pixels — narrower than this and resolution text becomes unreadable. */
const MIN_WIDTH = 240;
/** Maximum sidebar width — at this point it starts crowding the editor. */
const MAX_WIDTH = 800;
/** Default width (~22em at the default browser font size). */
const DEFAULT_WIDTH = 352;

/**
 * Persisted width (in CSS pixels) of the expanded annotations sidebar. Edited
 * by the drag-to-resize gesture in `Annotations.svelte`. Device-specific —
 * users likely want narrower sidebars on small screens and wider on desktops.
 */
export const AnnotationsWidthSetting = new Setting<number>(
    'annotationsWidth',
    true,
    DEFAULT_WIDTH,
    (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value))
            return undefined;
        if (value < MIN_WIDTH || value > MAX_WIDTH) return undefined;
        return value;
    },
    (current, value) => current === value,
);

export { MIN_WIDTH as ANNOTATIONS_MIN_WIDTH };
export { MAX_WIDTH as ANNOTATIONS_MAX_WIDTH };
