import { makeSidebarSetting } from '@db/settings/SidebarSetting';

/** Minimum sidebar width in CSS pixels — narrower than this and resolution text becomes unreadable. */
export const ANNOTATIONS_MIN_WIDTH = 240;
/** Maximum sidebar width — at this point it starts crowding the editor. */
export const ANNOTATIONS_MAX_WIDTH = 800;
/** Default width (~22em at the default browser font size). */
const DEFAULT_WIDTH = 352;

/**
 * Whether the annotations sidebar is shown and how wide it is, stored together
 * (see {@link SidebarState}). Defaults to shown.
 */
export const AnnotationsSetting = makeSidebarSetting('annotations', {
    shown: true,
    width: DEFAULT_WIDTH,
    minWidth: ANNOTATIONS_MIN_WIDTH,
    maxWidth: ANNOTATIONS_MAX_WIDTH,
});
