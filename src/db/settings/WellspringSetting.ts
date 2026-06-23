import { makeSidebarSetting } from '@db/settings/SidebarSetting';

/** Minimum sidebar width in CSS pixels — narrower than this and the code previews become unreadable. */
export const WELLSPRING_MIN_WIDTH = 150;
/** Maximum sidebar width — at this point it starts crowding the editor. */
export const WELLSPRING_MAX_WIDTH = 800;
/** Default width (~13em at the default browser font size). */
const DEFAULT_WIDTH = 210;

/**
 * Whether the blocks-mode Wellspring sidebar is shown and how wide it is, stored
 * together (see {@link SidebarState}). Defaults to shown so creators discover
 * the drag palette the first time they enter blocks mode.
 */
export const WellspringSetting = makeSidebarSetting('wellspring', {
    shown: true,
    width: DEFAULT_WIDTH,
    minWidth: WELLSPRING_MIN_WIDTH,
    maxWidth: WELLSPRING_MAX_WIDTH,
});
