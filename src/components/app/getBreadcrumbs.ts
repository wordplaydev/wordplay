import type { LocaleTextAccessor } from '@locale/Locales';

/**
 * The visible content of a breadcrumb: an optional leading emoji, plus either a
 * localized label or a plain string. Exactly one of label/text is present.
 */
type CrumbBody =
    | { emoji?: string; label: LocaleTextAccessor; text?: never }
    | { emoji?: string; text: string; label?: never };

/**
 * A crumb that links to a route. Always has `to`, so a trail of these can be
 * mapped to their destinations.
 */
export type RouteCrumb = CrumbBody & { to: string };

/** A crumb that runs an in-page action (e.g. jumping the guide's concept path). */
export type ActionCrumb = CrumbBody & { action: () => void };

/** The current location: rendered as a non-interactive span. */
export type CurrentCrumb = CrumbBody & { current: true };

/** Any crumb the Breadcrumbs component can render. */
export type Crumb = RouteCrumb | ActionCrumb | CurrentCrumb;

const HOME: RouteCrumb = {
    to: '/',
    emoji: '🏠',
    label: (l) => l.ui.page.breadcrumb.home,
};
const GALLERIES: RouteCrumb = {
    to: '/galleries',
    label: (l) => l.ui.page.galleries.header,
};
const CHARACTERS: RouteCrumb = {
    to: '/characters',
    label: (l) => l.ui.page.characters.header,
};
const TEACH: RouteCrumb = {
    to: '/teach',
    label: (l) => l.ui.page.teach.header,
};

/**
 * Compute the breadcrumb trail of ancestors above the current page from its
 * route position. The current page itself is never a crumb. Returns an empty
 * array (no breadcrumbs) for the landing page (the root) and the project route.
 *
 * @param routeId The SvelteKit route id, e.g. `/[[locale]]/gallery/[galleryid]`.
 * @param galleryid The resolved `galleryid` route param, when present.
 * @param name Display name for the gallery crumb on the how-to page, where the
 *   gallery is an ancestor rather than the current page.
 */
export default function getBreadcrumbTrail(
    routeId: string | null,
    galleryid: string | undefined,
    name: string | undefined,
): RouteCrumb[] {
    if (routeId === null) return [];
    const rel = routeId.replace('/[[locale]]', '') || '/';

    // No breadcrumbs on the landing page (root) or the project editor.
    // The trailing slash on '/project/' avoids matching '/projects'.
    if (rel === '/' || rel.startsWith('/project/')) return [];

    if (rel === '/gallery/[galleryid]/howto') {
        return name && galleryid
            ? [HOME, GALLERIES, { to: `/gallery/${galleryid}`, text: name }]
            : [HOME, GALLERIES];
    }
    if (rel === '/gallery/[galleryid]') return [HOME, GALLERIES];
    if (rel === '/galleries/moderation') return [HOME, GALLERIES];
    if (rel === '/character/[id]') return [HOME, CHARACTERS];
    if (rel.startsWith('/teach/class')) return [HOME, TEACH];

    return [HOME];
}
