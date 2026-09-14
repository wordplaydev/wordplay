/** Never prerendered: it exists to exchange a one-time token that only ever
 *  arrives in a URL fragment, so a built copy of it would be meaningless — and
 *  there would be thirty-two of them. */
export const prerender = false;
