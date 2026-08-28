<script module lang="ts">
    /** The gallery kinds, in tab order. Also the `?tab=` values, so a tab is
     *  linkable and survives a reload. */
    export const Tabs = ['yours', 'examples', 'public'] as const;

    /** Shown to everyone, so it's where signed-out visitors and unknown
     *  `?tab=` values land. */
    const DefaultTab = 'examples';
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import PreviewPlaceholder from '@components/app/PreviewPlaceholder.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { authAttempted, DB, Galleries, locales } from '@db/Database';
    import { GALLERY_CHUNK_SIZE } from '@db/firestoreLimits';
    import { Domain } from '@db/Domains';
    import { firestore } from '@db/firebase';
    import type { SerializedGallery } from '@db/galleries/Gallery';
    import Gallery, { upgradeGallery } from '@db/galleries/Gallery';
    import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { debounced } from '@util/debounce.svelte';
    import { localeGoto } from '@util/localeGoto';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        where,
    } from 'firebase/firestore';
    import { onMount, untrack } from 'svelte';
    import { searchProjects, type ProjectMatch } from '../projects/search';
    import {
        galleriesWorthSearching,
        searchGalleries,
        type GalleryMatch,
    } from './search';

    /** The tab the visitor actually asked for, from `?tab=` on load or a click.
     *  Undefined means they haven't chosen, which lets the default below settle
     *  once their galleries arrive. Read on the server too: this page isn't
     *  prerendered, so `?tab=` is available there, and honoring it means the
     *  first paint already shows the linked tab instead of the default swapping
     *  to it at hydration. */
    let tab = $state<(typeof Tabs)[number] | undefined>(
        Tabs.find((name) => name === page.url.searchParams.get('tab')),
    );

    const user = getUser();

    /** Whether we know enough to say a tab is unavailable: auth has reported in
     *  and the gallery cache has hydrated. Before that, "no user" and "no
     *  galleries" are just "not yet", and treating them as final swaps the
     *  panel's content out and then back. */
    let settled = $derived($authAttempted && Galleries.hydrated);

    /** Where to start when the visitor hasn't chosen: with your own galleries if
     *  you have any, otherwise the examples. Galleries load after mount, so this
     *  settles when they arrive rather than being fixed at page load. */
    let startingTab: (typeof Tabs)[number] = $derived(
        Galleries.accessibleGalleries.size > 0 ? 'yours' : DefaultTab,
    );

    /** "Yours" stays even with no galleries, since that's where you go to make
     *  one; it hides only for visitors without an account, who can't make one at
     *  all. It also stays while auth is still resolving, so a `?tab=yours` link
     *  isn't thrown away before we know who the visitor is. */
    let hiddenTabs = $derived(
        [$user || !$authAttempted ? undefined : Tabs.indexOf('yours')].filter(
            (index): index is number => index !== undefined,
        ),
    );

    /** The tab actually showing. Falls back to the default when the chosen one
     *  isn't available — signing out while on "yours" shouldn't leave the bar
     *  with nothing selected.
     *  `tab` itself is left alone, so the choice returns if it becomes available.
     *  Only falls back once `settled`, so a `?tab=` link isn't bounced to the
     *  default on the strength of data that hasn't arrived yet. */
    let showing = $derived.by(() => {
        const chosen = tab ?? startingTab;
        return settled && hiddenTabs.includes(Tabs.indexOf(chosen))
            ? DefaultTab
            : chosen;
    });
    /** No tab reads as selected while we're still holding the panel, so the bar
     *  doesn't claim a choice the visitor didn't make and we don't have to undo. */
    let tabIndex = $derived(
        tab === undefined && !settled ? undefined : Tabs.indexOf(showing),
    );

    // Reflect the chosen tab in the URL so it's linkable and survives a reload.
    // Writes `tab`, not `showing`: a deep link should survive a tab being
    // temporarily unavailable rather than be rewritten to the fallback, and an
    // unchosen tab leaves the URL clean so the default still applies on reload.
    $effect(() => {
        const params = new URLSearchParams(page.url.searchParams);
        if (tab === undefined) params.delete('tab');
        else params.set('tab', tab);
        const search = params.toString();
        const current =
            page.url.search.charAt(0) === '?'
                ? page.url.search.substring(1)
                : page.url.search;
        // goto rather than replaceState: it waits for the router, which an
        // effect on mount can otherwise beat. Keep focus and scroll so switching
        // tabs doesn't jump the page.
        if (search !== current)
            goto(`?${search}`, {
                replaceState: true,
                keepFocus: true,
                noScroll: true,
            });
    });

    let newGalleryError = $state(false);
    async function newGallery() {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create($locales);
            localeGoto(`/gallery/${newGalleryID}`);
        } catch (error) {
            console.error(error);
            newGalleryError = true;
        }
    }

    /**
     * How many approved public galleries to fetch. The whole set arrives at once
     * rather than a page at a time, because the search below runs over it in the
     * browser — paging would mean search only found what had already been
     * scrolled to. Curation (#1311) is what makes that affordable. Past this cap
     * the featured-then-id ordering is no longer the equal visibility the
     * shuffle gives; `Gallery.words` plus an array-contains-any query is the
     * scaling path when it matters.
     */
    const PublicGalleryLimit = 200;

    /** The public galleries, or undefined until the query settles. Undefined
     *  rather than `[]` so the tab can tell "still loading" from "none", and
     *  show loading feedback instead of an empty list that silently fills in. */
    let loadedGalleries: Gallery[] | undefined = $state(undefined);

    onMount(async () => {
        loadPublicGalleries();
    });

    async function loadPublicGalleries() {
        // Settle the list either way on a dead end, so the loading feedback
        // gives way to an empty list rather than showing forever.
        if (firestore === undefined) {
            loadedGalleries ??= [];
            return;
        }
        const approved = query(
            collection(firestore, GalleriesCollection),
            where('public', '==', true),
            // Being public is the curator's request; being approved is what
            // lists it (#1311).
            where('moderation', '==', 'approved'),
            orderBy('featured', 'desc'),
            orderBy('id'),
            limit(PublicGalleryLimit),
        );
        // Wrap in DB.read so a broken connection fails fast (rather than
        // hanging for minutes) and trips the site-wide connection banner.
        let documentSnapshots;
        try {
            documentSnapshots = await DB.read(getDocs(approved));
        } catch (_) {
            // The banner (via DB.read) carries the message; leave the list as-is,
            // but settle it so we don't hold the loading feedback forever.
            loadedGalleries ??= [];
            return;
        }

        loadedGalleries = documentSnapshots.docs.map(
            (snap) =>
                new Gallery(upgradeGallery(snap.data() as SerializedGallery)),
        );
    }

    /**
     * The listing, in an order drawn once per visit. #1311 asks for random order
     * so every public gallery gets equal visibility rather than the same few
     * always sitting at the top; drawing it once means the list doesn't reshuffle
     * under the reader as anything else on the page changes.
     */
    let shuffleSeed = Math.random();
    let galleries = $derived.by(() => {
        if (loadedGalleries === undefined) return undefined;
        // Fisher-Yates from a seed fixed for this page load. `shuffleSeed`
        // isn't state, so re-deriving for another reason keeps the same order.
        const shuffled = [...loadedGalleries];
        let random = shuffleSeed;
        for (let i = shuffled.length - 1; i > 0; i--) {
            random = (random * 9301 + 49297) % 233280;
            const j = Math.floor((random / 233280) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    });

    // Search across the built-in examples and the public galleries (#299). The
    // input updates `searchTerm` immediately, so loading can start promptly;
    // the search itself runs against a debounced copy.
    let searchTerm = $state('');
    const debouncedTerm = debounced(() => searchTerm);
    let searching = $derived(debouncedTerm.current.trim().length > 0);

    /** Every gallery that can be searched by name: the built-in ones and the
     *  approved public ones. */
    let searchableGalleries = $derived([
        ...Galleries.getExampleGalleries(),
        ...(loadedGalleries ?? []),
    ]);

    /** All example projects, loaded lazily when search is first used. The
     *  runtime arrives with the examples rather than with the page, so the
     *  gallery list renders before any project does. */
    let exampleProjects: Project[] = $state([]);
    let loadingExamples = $state(false);

    $effect(() => {
        if (
            searchTerm.trim().length > 0 &&
            exampleProjects.length === 0 &&
            !loadingExamples
        ) {
            loadingExamples = true;
            const ids = [
                ...new Set(
                    Galleries.getExampleGalleries().flatMap((g) =>
                        g.getProjects(),
                    ),
                ),
            ];
            DB.loadProjects()
                .then((db) => Promise.all(ids.map((id) => db.get(id))))
                .then((projects) => {
                    exampleProjects = projects.filter(
                        (p): p is Project => p !== undefined,
                    );
                    loadingExamples = false;
                });
        }
    });

    /**
     * Projects in the public galleries whose word index says they could match.
     * Loaded lazily and only for those galleries, since opening a gallery means
     * fetching and parsing every project in it — see galleriesWorthSearching.
     */
    let publicProjects: Project[] = $state([]);
    let loadingPublic = $state(false);
    /** Which galleries `publicProjects` was loaded for, so a refined term that
     *  selects the same galleries doesn't re-fetch them. */
    let loadedFor: string = $state('');

    $effect(() => {
        const term = debouncedTerm.current;
        const wanted = galleriesWorthSearching(
            loadedGalleries ?? [],
            term,
            $locales,
        )
            // Built-in galleries are already covered by `exampleProjects`.
            .filter((gallery) => !gallery.isBuiltIn());
        const key = wanted
            .map((gallery) => gallery.getID())
            .sort()
            .join(',');
        if (key === loadedFor || loadingPublic) return;
        if (key === '') {
            loadedFor = '';
            publicProjects = [];
            return;
        }
        loadingPublic = true;
        untrack(() => loadPublicProjects(wanted, key));
    });

    async function loadPublicProjects(wanted: Gallery[], key: string) {
        if (firestore === undefined) {
            loadingPublic = false;
            return;
        }
        const ids = wanted.map((gallery) => gallery.getID());
        const found: Project[] = [];
        try {
            // Dynamic, like the examples above: parsing a project needs the
            // language runtime, which is most of what this page would otherwise
            // have to download before showing a single gallery.
            const projects = await DB.loadProjects();
            // Chunked because the projects read rule does a get() of each
            // matched project's gallery, and Firestore allows only a handful of
            // document accesses per query — a query spanning more distinct
            // galleries than that budget is denied entirely, not partially.
            for (let i = 0; i < ids.length; i += GALLERY_CHUNK_SIZE) {
                const snapshot = await DB.read(
                    getDocs(
                        query(
                            collection(firestore, Domain.Projects),
                            where(
                                'gallery',
                                'in',
                                ids.slice(i, i + GALLERY_CHUNK_SIZE),
                            ),
                            where('public', '==', true),
                        ),
                    ),
                );
                for (const doc of snapshot.docs) {
                    const project = await projects.parseProject(doc.data());
                    if (project) found.push(project);
                }
            }
            publicProjects = found;
            loadedFor = key;
        } catch (_) {
            // DB.read raises the site-wide connection banner. Record the key
            // anyway, so a failed read settles instead of being retried the
            // moment `loadingPublic` clears — the effect would otherwise spin
            // against a broken connection. Results are left as they were rather
            // than emptied, which would claim there are none.
            loadedFor = key;
        } finally {
            loadingPublic = false;
        }
    }

    let galleryResults: GalleryMatch[] = $derived(
        searching
            ? searchGalleries(
                  searchableGalleries,
                  debouncedTerm.current,
                  $locales,
              )
            : [],
    );
    let exampleResults: ProjectMatch[] = $derived(
        searching
            ? searchProjects(exampleProjects, debouncedTerm.current, $locales)
            : [],
    );
    let publicResults: ProjectMatch[] = $derived(
        searching
            ? searchProjects(publicProjects, debouncedTerm.current, $locales)
            : [],
    );
    let anyResults = $derived(
        galleryResults.length + exampleResults.length + publicResults.length >
            0,
    );
    let loadingResults = $derived(loadingExamples || loadingPublic);
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.galleries.header} />
</svelte:head>

<Writing wide>
    <PageHeader
        header={(l) => l.ui.page.galleries.header}
        description={(l) => l.ui.page.galleries.prompt}
    />

    <!-- Above the tab bar rather than inside a tab: results span the built-in
         examples and the public galleries, so it isn't one tab's control (#299). -->
    <div class="search">
        <TextField
            id="gallery-search"
            bind:text={searchTerm}
            placeholder="🔍"
            description={(l) => l.ui.page.galleries.search.description}
            max="14em"
        />
    </div>

    {#if searching}
        <!-- The tabs are about where a gallery came from, which is not what a
             reader searching is asking; results replace them until the box is
             cleared. -->
        {#if loadingResults}
            <Spinning label={(l) => l.ui.widget.loading.message} />
        {:else if !anyResults}
            <Notice text={(l) => l.ui.page.galleries.search.noResults} />
        {:else}
            {#if galleryResults.length > 0}
                <Subheader text={(l) => l.ui.page.galleries.search.galleries} />
                <div class="previews">
                    {#each galleryResults as { gallery } (gallery.getID())}
                        <GalleryPreview {gallery} />
                    {/each}
                </div>
            {/if}
            {#if exampleResults.length > 0}
                <Subheader text={(l) => l.ui.page.galleries.search.examples} />
                <div class="search-results">
                    {#each exampleResults as { project, matchText } (project.getID())}
                        {@render result(project, matchText)}
                    {/each}
                </div>
            {/if}
            {#if publicResults.length > 0}
                <Subheader text={(l) => l.ui.page.galleries.search.projects} />
                <div class="search-results">
                    {#each publicResults as { project, matchText } (project.getID())}
                        {@render result(project, matchText)}
                    {/each}
                </div>
            {/if}
        {/if}
    {:else}
        <!-- Spaced off the page's explanation above, which otherwise runs straight
         into the tab bar. -->
        <div class="tabs">
            <Tabbed
                tabs={(l) => l.ui.page.galleries.section.tabs}
                choice={tabIndex}
                select={(choice) => (tab = Tabs[choice])}
                omit={hiddenTabs}
            >
                {#snippet children()}
                    <!-- A visitor who didn't ask for a tab gets one picked for them
                     from their galleries, which only arrive after mount. Hold the
                     panel until then rather than showing the default's content
                     and swapping it for theirs a moment later. -->
                    {#if tab === undefined && !settled}
                        <PreviewPlaceholder />
                    {:else if showing === 'yours'}
                        <!-- Signed out for certain — auth has reported in and there's
                         no user — so there's nothing on this tab to do. -->
                        {#if $user === null && $authAttempted}
                            <Notice
                                text={(l) =>
                                    l.ui.page.galleries.error.nogalleryedits}
                            />
                        {:else}
                            <!-- The explanation and the new-gallery button don't depend
                             on the galleries, so they render from the first paint;
                             only the list below waits. The button is inactive until
                             we know who's signed in, since creating a gallery needs
                             a user. -->
                            <MarkupHTMLView
                                markup={(l) => l.ui.page.galleries.section.own}
                            />
                            <p class="add">
                                <Button
                                    tip={(l) =>
                                        l.ui.page.galleries.button.newgallery}
                                    action={newGallery}
                                    icon="+"
                                    large
                                    active={isAuthenticated($user)}
                                ></Button></p
                            >
                            {#if newGalleryError}
                                <Notice
                                    text={(l) =>
                                        l.ui.page.projects.error.newgallery}
                                />
                            {/if}
                            {#if !isAuthenticated($user) || ((Galleries.getStatus() === 'loading' || Galleries.getStatus() === 'loggedout') && !Galleries.hydrated)}
                                <!-- Waiting on auth, or on the galleries themselves. We only
                 block on the realtime query before the local cache has
                 hydrated; once hydrated, render the user's cached galleries even
                 if the cloud query is still pending (e.g. offline), rather than
                 spinning forever.

                 We also treat 'loggedout' as "still loading" here: the gallery
                 listener is created once at startup (before auth), so it starts
                 'loggedout', and stays that way until startSync re-runs it for
                 this user. A definitely-signed-out visitor took the notice
                 branch above, so a 'loggedout' status here is stale, not real —
                 acting on it would flash "you must be logged in" spuriously. -->
                                <PreviewPlaceholder />
                            {:else if Galleries.getStatus() === 'noaccess'}
                                <Notice
                                    text={(l) =>
                                        l.ui.page.projects.error.noaccess}
                                />
                            {:else}
                                <div class="previews">
                                    {#each Galleries.accessibleGalleries.values() as gallery}
                                        <GalleryPreview {gallery} />
                                    {/each}
                                </div>
                            {/if}
                        {/if}
                    {:else if showing === 'examples'}
                        <MarkupHTMLView
                            markup={(l) => l.ui.page.galleries.section.examples}
                        />

                        <div class="previews">
                            {#each Galleries.getExampleGalleries() as gallery}
                                <GalleryPreview {gallery} />
                            {/each}
                        </div>
                    {:else if showing === 'public'}
                        <MarkupHTMLView
                            markup={(l) => l.ui.page.galleries.section.public}
                        />

                        {#if galleries === undefined}
                            <PreviewPlaceholder />
                        {:else if galleries.length === 0}
                            <!-- An empty list is silent about why it's empty, and
                             with curation "none yet" is a normal state. -->
                            <Notice
                                text={(l) => l.ui.page.galleries.error.nopublic}
                            />
                        {:else}
                            <div class="public">
                                <div class="previews">
                                    {#each galleries as gallery (gallery.getID())}
                                        <GalleryPreview {gallery} />
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/if}
                {/snippet}
            </Tabbed>
        </div>
    {/if}
</Writing>

{#snippet result(project: Project, matchText: string | undefined)}
    <ProjectPreview
        {project}
        searchTerm={debouncedTerm.current}
        {...matchText !== undefined ? { matchText } : {}}
        anonymize={false}
        ><Button
            tip={(l) => l.ui.page.projects.button.viewproject}
            action={() => localeGoto(project.getLink(false))}
            icon="👁️"
            background
        ></Button></ProjectPreview
    >
{/snippet}

<style>
    /* Separate the tab bar from the page's explanation above it. */
    .tabs {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    .search {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    /* One column, capped at the reading measure Writing uses when it isn't wide —
       a gallery's description shouldn't run the full width of this wide page. */
    .previews {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 40em);
        row-gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
        justify-items: start;
    }

    .public {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .add {
        margin-inline-start: calc(2 * var(--wordplay-spacing));
    }

    .search-results {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 28em), 1fr));
        column-gap: calc(4 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
        justify-items: start;
    }
</style>
