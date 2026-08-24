/** Where a Link stands relative to the page being viewed. */
export type LinkState = {
    /** The link points at exactly this page — same path *and* same query — so
     *  it renders as text rather than as something to follow. The query counts
     *  because /guide and /guide?concept=Phrase are different content, and only
     *  one of them is where you are. */
    active: boolean;
    /** The page is somewhere inside the link's section: its own page, or any
     *  page beneath it. This is what draws the footer nav's tab, so the footer
     *  says which part of the site you're in rather than going blank as soon as
     *  you open something. */
    inSection: boolean;
};

/** Split a destination into the path that names its section and the query that
 *  selects what it shows. A hash is dropped: it addresses a place within a
 *  page, not a different one. */
function split(to: string): { path: string; search: string } {
    const withoutHash = to.split('#')[0];
    const query = withoutHash.indexOf('?');
    return query === -1
        ? { path: withoutHash, search: '' }
        : {
              path: withoutHash.slice(0, query),
              search: withoutHash.slice(query),
          };
}

/** Sorted and re-encoded, so parameter order and escaping can't make two
 *  equivalent queries compare unequal. */
function normalize(search: string): string {
    const params = new URLSearchParams(search);
    params.sort();
    return params.toString();
}

/** The current path with any locale segment removed, so it compares against a
 *  destination, which is always written without one. */
export function withoutLocale(
    pathname: string,
    locale: string | undefined,
): string {
    if (locale === undefined) return pathname;
    if (!pathname.startsWith(`/${locale}`)) return pathname;
    const rest = pathname.slice(locale.length + 1);
    return rest.length === 0 ? '/' : rest;
}

/**
 * Decide how a link should present itself on the page currently being viewed.
 *
 * Compared by path rather than by route id because a route id is a pattern
 * (`/[[locale]]/project/[projectid]`) and so can't say *which* project you're
 * on — every project page would look like every other.
 */
export default function getLinkState(
    /** The current URL's pathname, locale segment included. */
    pathname: string,
    /** The current URL's query, e.g. `?concept=Phrase`. */
    search: string,
    /** The locale segment of the current route, if it has one. */
    locale: string | undefined,
    /** The link's destination, written without a locale. */
    to: string,
    /** Extra path prefixes that belong to the destination's section. A project
     *  page lives at /project/…, not /projects/…, so which section a path
     *  belongs to can't always be derived from the path itself. */
    within: string[] = [],
): LinkState {
    const here = withoutLocale(pathname, locale);
    const target = split(to);
    const active =
        here === target.path && normalize(search) === normalize(target.search);
    // Home owns only itself; every path is inside "/".
    const inSection =
        target.path === '/'
            ? active
            : [target.path, ...within].some(
                  (prefix) => here === prefix || here.startsWith(`${prefix}/`),
              );
    return { active, inSection };
}
