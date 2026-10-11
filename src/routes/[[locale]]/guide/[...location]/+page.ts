/**
 * Concepts, searches, and kits: never prerendered. There are hundreds of concepts in each
 * of thirty-odd locales, and the crawler follows every concept link, so prerendering
 * this route wrote seventeen thousand pages. The host serves these the app's empty shell
 * (`200.html`) instead, and the client renders the location directly — which is also
 * what keeps the default landing from flashing up before a concept (see `guidePath.ts`).
 */
export const prerender = false;
