/** The query param persisting the project's evaluation mode: edit, step, or play. */
export const PROJECT_PARAM_MODE = 'mode';

/** The values `mode` takes. */
export const PROJECT_MODE_EDIT = 'edit';
export const PROJECT_MODE_PLAY = 'play';

/** Where a scratch project was opened from, so it can offer a way back. Always
 *  a same-origin path; the project view checks that before rendering a link. */
export const PROJECT_PARAM_FROM = 'from';

/** Legacy params, still parsed so old links work; rewritten to the mode param on load. */
export const PROJECT_PARAM_PLAY = 'play';
export const PROJECT_PARAM_EDIT = 'edit';
