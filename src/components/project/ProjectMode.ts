/** The three project evaluation modes. Order matters: it's the display and
 * URL order and the Mode widget's choice index, and it must stay in step with
 * the positional `labels`/`tips` tuples in every locale's `ui.output.mode`.
 * Debug sits between edit and play because it is a lens on the same paused
 * position edit holds. (The ctrl/meta+Enter toggle deliberately skips it:
 * edit ⇄ play is the constant motion, and debug is a chosen destination.) */
import DebugIcon from '@components/project/DebugIcon.svelte';
import PlayIcon from '@components/project/PlayIcon.svelte';
import { EDIT_SYMBOL, VIEW_SYMBOL } from '@parser/Symbols';

export const ProjectModes = ['edit', 'debug', 'play'] as const;

export type ProjectMode = (typeof ProjectModes)[number];

/** The mode switcher's icons, in ProjectModes order, defined beside the modes
 * so the two can't drift. Both switchers (the output tile's and the footer's)
 * render these; read-only projects show a viewing eye where editable ones show
 * a pencil. Debug and play are drawn marks rather than glyphs, since the
 * playback codepoints render unpredictably across platforms: bare pause bars
 * for the held world of debug, a bare triangle for live play. */
export const ProjectModeIcons = [EDIT_SYMBOL, DebugIcon, PlayIcon] as const;
export const ProjectModeViewIcons = [VIEW_SYMBOL, DebugIcon, PlayIcon] as const;
