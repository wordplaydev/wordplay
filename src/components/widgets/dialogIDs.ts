/**
 * Ids of dialogs that something outside the dialog's own component needs to name, so the two
 * can't drift apart. Opening one is `setDialogInURL(id, true)`.
 *
 * Kept apart from dialogURL.ts, which imports SvelteKit's `$app` modules. Conflict and node
 * code is reachable from the basis, which the locale tooling builds outside SvelteKit, so it
 * can only import modules with no framework dependencies — this file has none.
 */

/** The project's languages dialog, which UnknownName points at when a name belongs to a
 *  language the project isn't written in. */
export const LanguagesDialogID = 'languages';

/** The app-wide language chooser in the page footer. The landing page's "other languages"
 *  button opens that one rather than mounting its own: two dialogs sharing an id both
 *  match the URL param and both open, stacking one modal on another. */
export const LocaleDialogID = 'locale';
