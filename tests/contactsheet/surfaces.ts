/**
 * Every UI surface the contact sheet photographs, and what the September 2026
 * consistency audit found on each.
 *
 * The findings travel with the surface rather than living in the generator, so
 * the "after" run reuses the same table and the review page can show before and
 * after side by side under one label.
 */

/**
 * Who has to be signed in for a surface to render.
 *
 * `creator` is the worker fixture's own throwaway account — right for surfaces
 * that are about *having* an account. `owner` is the seeded `creator` account,
 * which owns the seed projects: the share and languages dialogs are mounted by
 * ProjectFooter only for someone who can edit the project, so a non-owner
 * photographs the page with no dialog on it at all.
 */
export type Auth = 'none' | 'creator' | 'owner' | 'admin' | 'teacher';

export type Surface = {
    /** File-name stem and the key a tile is looked up by. */
    slug: string;
    /** Where to navigate. Query parameters are part of the surface. */
    path: string;
    kind: 'route' | 'dialog' | 'tile' | 'stub';
    auth: Auth;
    /** What the sheet calls it. */
    title: string;
    /**
     * A selector that says the surface's own content has arrived. Routes that
     * fetch their content need one, or the shot is of an empty page whose
     * header happens to be up. Mirrors `ContentMarkers` in
     * tests/end2end/accessibility.spec.ts.
     */
    ready?: string;
    /** Capture only this element, for a route that hosts several chromes. */
    clip?: string;
    /**
     * The tile toggle to press before shooting, for a chrome that is closed by
     * default. Tile toggles are `{tile.id}-toggle` (NonSourceTileToggle).
     */
    open?: string;
    /** Findings register IDs that land on this surface. */
    findings?: string[];
    /** Anything a reviewer needs to know to read the tile. */
    note?: string;
};

/** A gallery the seed publishes, used for the public how-to space. */
const PublicGallery = 'seed-public-gallery-00';

export const Surfaces: Surface[] = [
    // ---- Public routes. The first sixteen are PUBLIC_ROUTES from
    // tests/end2end/accessibility.spec.ts, verbatim, including its
    // query-parameter entries — those are surfaces a route list alone misses.
    {
        slug: 'landing',
        path: '/',
        kind: 'route',
        auth: 'none',
        title: 'Landing',
        findings: ['D1', 'D5'],
        note: 'Showcase’s round picker is a documented tab pattern — chrome only.',
    },
    {
        slug: 'learn',
        path: '/learn',
        kind: 'route',
        auth: 'none',
        title: 'Learn',
    },
    {
        slug: 'guide',
        path: '/guide',
        kind: 'route',
        auth: 'none',
        title: 'Guide',
        findings: ['C1', 'E4'],
        note: 'Documentation reimplements Breadcrumbs; its trail scrolls rather than wrapping.',
    },
    {
        slug: 'guide-kits',
        path: '/guide?section=kits',
        kind: 'route',
        auth: 'none',
        title: 'Guide — kits',
        findings: ['D5', 'E4'],
        note: 'KitKindFilter hand-copied Mode’s chrome. The widget divergence itself is documented and stays.',
    },
    {
        slug: 'guide-concept',
        path: '/guide?concept=Sequence/shake',
        kind: 'route',
        auth: 'none',
        title: 'Guide — a concept',
        findings: ['H2'],
        note: 'ConceptPreview carries a malformed border-radius shorthand.',
    },
    {
        slug: 'login',
        path: '/login',
        kind: 'route',
        auth: 'none',
        title: 'Login',
    },
    {
        slug: 'rights',
        path: '/rights',
        kind: 'route',
        auth: 'none',
        title: 'Rights',
    },
    {
        slug: 'donate',
        path: '/donate',
        kind: 'route',
        auth: 'none',
        title: 'Donate',
    },
    {
        slug: 'about',
        path: '/about',
        kind: 'route',
        auth: 'none',
        title: 'About',
    },
    { slug: 'join', path: '/join', kind: 'route', auth: 'none', title: 'Join' },
    {
        slug: 'galleries',
        path: '/galleries',
        kind: 'route',
        auth: 'none',
        title: 'Galleries',
        findings: ['H3'],
        note: 'GalleryPreview compensates for a Subheader nowrap that no longer exists.',
    },
    {
        slug: 'characters',
        path: '/characters',
        kind: 'route',
        // Signed in as the account the seed gives characters to. The route is
        // public, but a visitor sees "you must be logged in" and no previews at
        // all — and the preview tile is the whole point of G1.
        auth: 'owner',
        title: 'Characters',
        // The previews arrive over a Firestore subscription, well after the
        // page heading. Without this the shot is of an empty page.
        ready: '.preview .character',
        findings: ['G1'],
        note: 'CharacterPreview: square corners, no hover, hardcoded 128px — beside ProjectPreview on /projects, which is rounded and scales on hover.',
    },
    {
        slug: 'design',
        path: '/design',
        kind: 'route',
        auth: 'none',
        title: 'Design reference',
        findings: ['A3'],
        note: 'Its spacing table says 0.5em/0.25em; app.html says 0.5rem/0.25rem.',
    },
    {
        slug: 'howto-public',
        path: `/gallery/${PublicGallery}/howto`,
        kind: 'route',
        auth: 'none',
        title: 'How-to space (signed out)',
        ready: '.howtotitle',
        findings: ['C5', 'D4'],
    },
    {
        slug: 'updates',
        path: '/updates',
        kind: 'route',
        auth: 'none',
        title: 'Updates',
        ready: 'h3',
        findings: ['E4'],
    },
    {
        slug: 'thanks',
        path: '/thanks',
        kind: 'route',
        auth: 'none',
        title: 'Thanks',
        findings: ['F1', 'D4'],
        note: 'Bare Header, no PageHeader. One of three disagreeing .card treatments.',
    },

    // ---- Public surfaces the accessibility list does not reach.
    {
        slug: 'not-found',
        path: '/en-US/does-not-exist',
        kind: 'route',
        auth: 'none',
        title: 'Error boundary',
    },

    // ---- Dialogs. Each opens from the URL; see widgets/dialogURL.ts.
    {
        slug: 'dialog-settings',
        path: '/?dialog=settings',
        kind: 'dialog',
        auth: 'none',
        title: 'Settings dialog',
        findings: ['E5', 'D1'],
    },
    {
        slug: 'dialog-locale',
        path: '/?dialog=locale',
        kind: 'dialog',
        auth: 'none',
        title: 'Language dialog',
    },
    {
        slug: 'dialog-feedback',
        path: '/?dialog=feedback',
        kind: 'dialog',
        auth: 'none',
        title: 'Feedback dialog',
        findings: ['A1', 'D4'],
        note: 'Five raw spacing values — among the worst files in the audit.',
    },
    {
        slug: 'dialog-status',
        path: '/?dialog=status',
        kind: 'dialog',
        auth: 'none',
        title: 'Status dialog',
    },

    // ---- Signed in as an ordinary creator.
    {
        slug: 'projects',
        path: '/projects',
        kind: 'route',
        auth: 'creator',
        title: 'Projects',
        findings: ['D1', 'G1'],
        note: 'Auto-creates a project, so the content is synthetic.',
    },
    {
        slug: 'profile',
        path: '/profile',
        kind: 'route',
        auth: 'creator',
        title: 'Profile',
        findings: ['D1', 'D2'],
    },
    {
        slug: 'dialog-notifications',
        path: '/projects?dialog=notifications',
        kind: 'dialog',
        auth: 'creator',
        title: 'Notifications dialog',
        findings: ['D4'],
    },

    // ---- The project route's four distinct chromes, on one navigation.
    // `clip` is what makes them separate tiles of one page rather than four
    // page loads; `open` presses the toggle for a chrome that starts closed.
    {
        slug: 'project-editor',
        path: '/project/seed-project-00',
        kind: 'tile',
        auth: 'owner',
        title: 'Project — editor tile',
        clip: '.editor',
        findings: ['A1', 'B3', 'E2'],
        note: 'TokenView’s spacing is deliberately off-grid; FoldButton stays a raw button.',
    },
    {
        slug: 'project-stage',
        path: '/project/seed-project-00',
        kind: 'tile',
        auth: 'owner',
        title: 'Project — stage tile',
        clip: '[data-testid="tile-output"]',
        findings: ['A1', 'C2'],
    },
    {
        slug: 'project-palette',
        path: '/project/seed-project-00',
        kind: 'tile',
        auth: 'owner',
        title: 'Project — palette',
        clip: '[data-testid="tile-palette"]',
        open: 'palette-toggle',
        findings: ['D3'],
        note: 'Seven adjacent palette editors repeat one column rule. The shot is the palette at rest — nothing is selected, so the editors themselves are not on screen; the finding is about their source, not this view.',
    },
    {
        slug: 'project-docs',
        path: '/project/seed-project-00',
        kind: 'tile',
        auth: 'owner',
        title: 'Project — documentation tile',
        clip: '[data-testid="tile-docs"]',
        open: 'docs-toggle',
        findings: ['C1', 'E4'],
    },
    {
        slug: 'dialog-shortcuts',
        path: '/project/seed-project-00?dialog=shortcuts',
        kind: 'dialog',
        auth: 'owner',
        title: 'Keyboard shortcuts dialog',
        findings: ['H5'],
        note: 'The capture control is a Toggle. CLAUDE.md still calls it a plain button.',
    },
    {
        slug: 'dialog-languages',
        path: '/project/seed-project-00?dialog=languages',
        kind: 'dialog',
        auth: 'owner',
        title: 'Languages dialog',
        findings: ['C2', 'C5'],
    },
    {
        slug: 'dialog-share',
        path: '/project/seed-project-00?dialog=share',
        kind: 'dialog',
        auth: 'owner',
        title: 'Share dialog',
        findings: ['D1'],
    },

    // ---- Privileged surfaces.
    {
        slug: 'moderate',
        path: '/moderate',
        kind: 'route',
        auth: 'admin',
        title: 'Moderate',
        findings: ['C3', 'F1', 'E4'],
        note: 'The .flag rule and its comment appear in three files. Bare Header, no PageHeader.',
    },
    {
        slug: 'admin',
        path: '/admin',
        kind: 'route',
        auth: 'admin',
        title: 'Privileges',
        findings: ['D1'],
    },
    {
        slug: 'teach',
        path: '/teach',
        kind: 'route',
        auth: 'teacher',
        title: 'Teach',
        findings: ['F2'],
        note: 'The layout renders PageHeader and the page renders its own Header in a different subtree, breaking the sibling invariant that keeps the gap constant.',
    },
    {
        slug: 'teach-new-class',
        path: '/teach/class/new',
        kind: 'route',
        auth: 'teacher',
        title: 'New class',
        findings: ['F2', 'E5'],
    },
];

/** Surfaces re-shot at 320px, where wrapping defects appear and nowhere else. */
export const ReflowSlugs = new Set([
    'landing',
    'guide',
    'galleries',
    'characters',
    'thanks',
    'design',
    'projects',
    'moderate',
]);
