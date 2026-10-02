import type { AssetPath, RouteId } from '$app/types';

/*
 * Every internal link is written without its locale, as `/guide` or
 * `/gallery/${id}`, and prefixed with the reader's locale where it is used
 * (`Link`, `localeGoto`). These types are derived from the routes SvelteKit
 * generates, so a path naming a route that doesn't exist is a type error rather
 * than a 404 nobody notices.
 *
 * Kit's own `Path` type can't do this here: the optional `[[locale]]` segment
 * puts a bare `${string}` in its union, so it accepts every string. Its `$app`
 * import is type-only on purpose, so a model on the shares graph can name its
 * link's type without reaching `$app` at runtime.
 */

/** A route segment, with a `[param]` standing for any string. */
type Segment<S extends string> = S extends `[${string}]` ? string : S;

/** A route ID's segments, each filled. */
type Filled<S extends string> = S extends `${infer Head}/${infer Rest}`
    ? `${Segment<Head>}/${Filled<Rest>}`
    : Segment<S>;

/** A route ID without the leading locale segment every route sits under. */
type Unlocalized<R extends string> = R extends `/[[locale]]${infer Rest}`
    ? Rest extends ''
        ? '/'
        : Rest
    : R;

/** A path to a route, without a query or fragment: `/guide`, `/character/${string}`. */
export type AppRoute = Filled<Unlocalized<RouteId>>;

/** A path to a route, as `Link` and `localeGoto` take it, with an optional query or fragment. */
export type AppPath =
    AppRoute | `${AppRoute}?${string}` | `${AppRoute}#${string}`;

/** A file served from `static/`, as a root-relative URL. */
export type StaticPath = `/${AssetPath}`;

/** A link that leaves the app. */
export type ExternalURL =
    `https://${string}` | `http://${string}` | `mailto:${string}`;

/** A route ID without its locale segment: `/guide`, `/character/[id]`. */
type AppRouteId = Unlocalized<RouteId>;

/**
 * Every route, for checking a path that only exists at runtime — a link a
 * creator wrote in markup. Held to the generated routes in both directions: a
 * misspelled entry fails `satisfies`, and a route missing from the list fails
 * `RoutesListed` below.
 */
const Routes = [
    '/',
    '/about',
    '/admin',
    '/character/[id]',
    '/characters',
    '/design',
    '/donate',
    '/galleries',
    '/gallery/[galleryid]',
    '/gallery/[galleryid]/howto',
    '/guide',
    '/join',
    '/kits',
    '/learn',
    '/localize',
    '/login',
    '/moderate',
    '/profile',
    '/project/[projectid]',
    '/projects',
    '/proxy',
    '/rights',
    '/teach',
    '/teach/class/[classid]',
    '/teach/class/new',
    '/thanks',
    '/updates',
] as const satisfies readonly AppRouteId[];

/** `never` when every route is listed; otherwise names the routes that aren't. */
type Unlisted = Exclude<AppRouteId, (typeof Routes)[number]>;
export const RoutesListed: [Unlisted] extends [never] ? true : Unlisted = true;

const RoutePatterns = Routes.map(
    (route) =>
        new RegExp(
            `^${route.replace(/[.?+*^$(){}|\\]/g, '\\$&').replace(/\[[^\]]+\]/g, '[^/]+')}$`,
        ),
);

/** Whether a path, with any query or fragment, names one of the app's routes. */
export function isAppPath(path: string): path is AppPath {
    const pathname = path.split(/[?#]/, 1)[0] ?? '';
    return RoutePatterns.some((pattern) => pattern.test(pathname));
}

/** Whether a URL leaves the app by one of the schemes `ExternalURL` names. */
export function isExternalURL(url: string): url is ExternalURL {
    return (
        url.startsWith('https://') ||
        url.startsWith('http://') ||
        url.startsWith('mailto:')
    );
}

/**
 * Where a link a creator wrote in markup may go: one of the app's routes or an
 * external URL. A path naming no route — a misspelled one, or one a translation
 * translated — is undefined, so the description renders as plain text rather
 * than as a link to a 404.
 */
export function authoredLink(
    href: string | undefined,
): AppPath | ExternalURL | undefined {
    if (href === undefined) return undefined;
    return isAppPath(href) || isExternalURL(href) ? href : undefined;
}
