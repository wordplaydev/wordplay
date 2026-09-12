import { redirect } from '@sveltejs/kit';

/**
 * The kit registry used to be a page of its own; it is now a section of the guide (#8).
 *
 * Kept as a redirect rather than deleted outright, because the URL is in the wild — it
 * was the nav bar's own link and the address of every kit listing — and a 404 is a worse
 * answer than the place the content actually went. Prerendering is off: a prerendered
 * redirect is a page that says "go here", where this is an HTTP one.
 */
export const prerender = false;

export function load() {
    redirect(308, '/guide?section=kits');
}
