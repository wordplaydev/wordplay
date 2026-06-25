/** Reusable functions for persisting which dialog is open in the page URL.
 *
 * The URL models "which single dialog is open" as one `dialog` query value, so
 * opening a dialog implicitly closes any other (matching modal `<dialog>`
 * semantics). State flows one way: an event writes the URL, and Dialog's
 * reconciliation effect derives `show` from it. */

import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteSet } from 'svelte/reactivity';

export const PARAM_DIALOG = 'dialog';

/** Ids of persistable dialogs currently mounted. Reactive so the layout's
 *  cleanup re-runs as dialogs mount/unmount and can tell whether a `dialog`
 *  param has an owner on the current page. */
export const mountedDialogIds = new SvelteSet<string>();

/** Whether the URL currently requests this dialog be open. */
export function isDialogOpenInURL(id: string): boolean {
    return page.url.searchParams.get(PARAM_DIALOG) === id;
}

/** Navigate to the current path with `search` as the query, only when it
 *  differs from the current query. Uses replaceState to avoid history clutter
 *  and keeps focus/scroll so opening a dialog doesn't disrupt the page. */
function replaceSearch(params: URLSearchParams) {
    // Strip the `=` from valueless keys (e.g. `play`, `edit`) so the result
    // matches the normalization other URL writers use (see ProjectView), avoiding
    // a redundant follow-up navigation when those params are preserved.
    const search = params.toString().replace(/=(?=&|$)/gm, '');
    const currentSearch =
        page.url.search.charAt(0) === '?'
            ? page.url.search.substring(1)
            : page.url.search;
    if (search !== currentSearch)
        goto(search ? `?${search}` : page.url.pathname, {
            replaceState: true,
            keepFocus: true,
            noScroll: true,
        });
}

/** Set `dialog=id` when opening, or remove it when closing (only if it still
 *  refers to this dialog, so a newly-opened dialog isn't clobbered). */
export function setDialogInURL(id: string, open: boolean) {
    const params = new URLSearchParams(page.url.searchParams);
    if (open) params.set(PARAM_DIALOG, id);
    else if (params.get(PARAM_DIALOG) === id) params.delete(PARAM_DIALOG);
    replaceSearch(params);
}

/** Strip the `dialog` param when no mounted dialog claims it, so a shared or
 *  stale link (e.g. `/?dialog=share` on a page without a share dialog) loads
 *  fully rather than leaving a dirty URL. */
export function clearUnclaimedDialog() {
    const current = page.url.searchParams.get(PARAM_DIALOG);
    if (current !== null && !mountedDialogIds.has(current)) {
        const params = new URLSearchParams(page.url.searchParams);
        params.delete(PARAM_DIALOG);
        replaceSearch(params);
    }
}
