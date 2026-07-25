<script module lang="ts">
    /** The gallery kinds, in tab order. Also the `?tab=` values, so a tab is
     *  linkable and survives a reload. */
    export const Tabs = ['yours', 'examples', 'howtos', 'public'] as const;

    /** Shown to everyone, so it's where signed-out visitors and unknown
     *  `?tab=` values land. */
    const DefaultTab = 'examples';
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import PreviewPlaceholder from '@components/app/PreviewPlaceholder.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import {
        authAttempted,
        DB,
        Galleries,
        locales,
        Projects,
    } from '@db/Database';
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
        startAfter,
        where,
        type DocumentData,
        type QueryDocumentSnapshot,
    } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { searchProjects, type ProjectMatch } from '../projects/search';

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

    /** Only "how-tos" hides when empty — there's nothing to do in it. "Yours"
     *  stays even with no galleries, since that's where you go to make one; it
     *  hides only for visitors without an account, who can't make one at all.
     *  It also stays while auth is still resolving, so a `?tab=yours` link isn't
     *  thrown away before we know who the visitor is. */
    let hiddenTabs = $derived(
        [
            $user || !$authAttempted ? undefined : Tabs.indexOf('yours'),
            Galleries.expandedScopeGalleries.size > 0
                ? undefined
                : Tabs.indexOf('howtos'),
        ].filter((index): index is number => index !== undefined),
    );

    /** The tab actually showing. Falls back to the default when the chosen one
     *  isn't available — signing out while on "yours", or a gallery you belonged
     *  to withdrawing its how-tos, shouldn't leave the bar with nothing selected.
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

    let lastBatch = $state<QueryDocumentSnapshot<DocumentData> | undefined>(
        undefined,
    );

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

    /** The public galleries fetched so far, or undefined until the first batch
     *  settles. Undefined rather than `[]` so the tab can tell "still loading"
     *  from "none", and show loading feedback instead of an empty list that
     *  silently fills in. */
    let loadedGalleries: Gallery[] | undefined = $state(undefined);

    onMount(async () => {
        nextBatch();
    });

    async function nextBatch() {
        // Settle the list either way on a dead end, so the loading feedback
        // gives way to an empty list rather than showing forever.
        if (firestore === undefined) {
            loadedGalleries ??= [];
            return firestore;
        }
        const first = lastBatch
            ? query(
                  collection(firestore, GalleriesCollection),
                  where('public', '==', true),
                  orderBy('featured'),
                  orderBy('id'),
                  startAfter(lastBatch),
                  limit(5),
              )
            : query(
                  collection(firestore, GalleriesCollection),
                  where('public', '==', true),
                  orderBy('featured'),
                  orderBy('id'),
                  limit(5),
              );
        // Wrap in DB.read so a broken connection fails fast (rather than
        // hanging for minutes) and trips the site-wide connection banner.
        let documentSnapshots;
        try {
            documentSnapshots = await DB.read(getDocs(first));
        } catch (_) {
            // The banner (via DB.read) carries the message; leave the list as-is,
            // but settle it so we don't hold the loading feedback forever.
            loadedGalleries ??= [];
            return;
        }

        // Remember the last document.
        lastBatch = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // Convert the docs to galleries
        loadedGalleries = [
            ...(loadedGalleries ?? []),
            ...documentSnapshots.docs.map(
                (snap) =>
                    new Gallery(
                        upgradeGallery(snap.data() as SerializedGallery),
                    ),
            ),
        ];
    }

    let galleries = $derived(
        loadedGalleries === undefined ? undefined : [...loadedGalleries],
    );

    // Search functionality for example gallery projects. The input updates
    // `searchTerm` immediately (so loading can start promptly); the search runs
    // against a debounced copy.
    let searchTerm = $state('');
    const debouncedTerm = debounced(() => searchTerm);

    /** All example projects, loaded lazily when search is first used */
    let allExampleProjects: Project[] = $state([]);
    let loadingExamples = $state(false);

    $effect(() => {
        if (
            searchTerm.trim().length > 0 &&
            allExampleProjects.length === 0 &&
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
            Promise.all(ids.map((id) => Projects.get(id))).then((projects) => {
                allExampleProjects = projects.filter(
                    (p): p is Project => p !== undefined,
                );
                loadingExamples = false;
            });
        }
    });

    let searchResults: ProjectMatch[] = $derived(
        searchProjects(allExampleProjects, debouncedTerm.current, $locales),
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.galleries.header} />
</svelte:head>

<Writing wide>
    <PageHeader
        header={(l) => l.ui.page.galleries.header}
        description={(l) => l.ui.page.galleries.prompt}
    />

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
                                text={(l) => l.ui.page.projects.error.noaccess}
                            />
                        {:else}
                            <div class="previews">
                                {#each Galleries.accessibleGalleries.values() as gallery}
                                    <GalleryPreview {gallery} />
                                {/each}
                            </div>
                        {/if}
                    {/if}
                {:else if showing === 'howtos'}
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.galleries.section.howtos}
                    />
                    {#each Galleries.expandedScopeGalleries.values() as gallery}
                        <div class="howtoonlypreview">
                            <Subheader>
                                <Link to={`/gallery/${gallery.getID()}/howto`}
                                    >{gallery.getName($locales)}</Link
                                >
                            </Subheader>
                            <MarkupHTMLView
                                markup={gallery.getDescription($locales)
                                    .length > 0
                                    ? gallery.getDescription($locales)
                                    : (l) => l.ui.gallery.undescribed}
                            /></div
                        >
                    {/each}
                {:else if showing === 'examples'}
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.galleries.section.examples}
                    />

                    <TextField
                        id="gallery-project-search"
                        bind:text={searchTerm}
                        placeholder="🔍"
                        description={(l) =>
                            l.ui.page.galleries.search.description}
                        max="10em"
                    />

                    {#if debouncedTerm.current.trim()}
                        {#if loadingExamples}
                            <Spinning
                                label={(l) => l.ui.widget.loading.message}
                            />
                        {:else if searchResults.length === 0}
                            <Notice
                                text={(l) =>
                                    l.ui.page.galleries.search.noResults}
                            />
                        {:else}
                            <div class="search-results">
                                {#each searchResults as { project, matchText } (project.getID())}
                                    <ProjectPreview
                                        {project}
                                        searchTerm={debouncedTerm.current}
                                        {...matchText !== undefined
                                            ? { matchText }
                                            : {}}
                                        anonymize={false}
                                        ><Button
                                            tip={(l) =>
                                                l.ui.page.projects.button
                                                    .viewproject}
                                            action={() =>
                                                localeGoto(
                                                    project.getLink(false),
                                                )}
                                            icon="👁️"
                                            background
                                        ></Button></ProjectPreview
                                    >
                                {/each}
                            </div>
                        {/if}
                    {:else}
                        <div class="previews">
                            {#each Galleries.getExampleGalleries() as gallery}
                                <div class="preview">
                                    <GalleryPreview {gallery} />
                                </div>
                            {/each}
                        </div>
                    {/if}
                {:else if showing === 'public'}
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.galleries.section.public}
                    />

                    {#if galleries === undefined}
                        <PreviewPlaceholder />
                    {:else}
                        <div class="public">
                            <div class="previews">
                                {#each galleries as gallery}
                                    <div class="preview">
                                        <GalleryPreview {gallery} />
                                    </div>
                                {/each}
                            </div>
                            {#if lastBatch}
                                <Button
                                    background
                                    tip={(l) =>
                                        l.ui.page.galleries.button.more.tip}
                                    action={nextBatch}
                                    label={(l) =>
                                        l.ui.page.galleries.button.more.label}
                                />
                            {/if}
                        </div>
                    {/if}
                {/if}
            {/snippet}
        </Tabbed>
    </div>
</Writing>

<style>
    /* Separate the tab bar from the page's explanation above it. */
    .tabs {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    /* A grid so that when the page is wide enough for multiple columns,
       previews share a consistent inline-start across rows. */
    .previews {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 28em), 1fr));
        column-gap: calc(4 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
    }

    .public {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .add {
        margin-inline-start: calc(2 * var(--wordplay-spacing));
    }

    .howtoonlypreview {
        gap: var(--wordplay-spacing);
    }

    /* Let long gallery names wrap instead of overflowing — Subheader is
       `white-space: nowrap` by default. */
    .howtoonlypreview > :global(h2) {
        white-space: normal;
        overflow-wrap: anywhere;
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
