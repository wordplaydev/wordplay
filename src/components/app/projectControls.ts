import type Project from '@db/projects/Project';
import type { LocaleTextAccessor } from '@locale/Locales';

/** One of the controls a project tile offers — edit, remix, and so on.
 *  `false` means the list this tile is in doesn't offer that control. */
export type ProjectAction =
    | {
          description: LocaleTextAccessor;
          label: string;
          action: (project: Project) => void;
      }
    | false;

/** A control that asks before it acts, like archiving. Computed per project,
 *  since whether it's offered can depend on the project. */
export type ProjectConfirmAction = (project: Project) =>
    | {
          description: LocaleTextAccessor;
          prompt: LocaleTextAccessor;
          label: string;
          action: () => void;
      }
    | false;

/**
 * How a project tile takes part in the projects page's selection and moving.
 *
 * Passed down rather than plumbed prop by prop because a tile appears in three
 * places — the top level, inside each folder, and flattened search results —
 * and all three have to behave identically. Pages that only list projects (a
 * gallery, the share dialog) leave it undefined and get plain tiles.
 */
export type ProjectInteraction = {
    /** Whether this project is what's currently chosen. */
    selected: (project: Project) => boolean;
    /** Choose it. Called for a click that didn't land on a link or a button. */
    select: (project: Project) => void;
    /** Keys pressed while the tile has focus — the arrows that move it. */
    key: (event: KeyboardEvent, project: Project) => void;
    /** A press on the tile that might become a drag. */
    grab: (event: PointerEvent, project: Project) => void;
};
