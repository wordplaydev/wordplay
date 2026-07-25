<script module lang="ts">
    /** The gallery kinds, in tab order. Also the `?tab=` values, so a tab is
     *  linkable and survives a reload. */
    export const Tabs = ['yours', 'examples', 'howtos', 'public'] as const;

    /** Shown to everyone, so it's where signed-out visitors and unknown
     *  `?tab=` values land. */
    const DefaultTab = 'examples';
</script>

<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
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
     *  once their galleries arrive. Reading url.searchParams throws during
     *  prerendering, so only the browser reads it. */
    let tab = $state<(typeof Tabs)[number] | undefined>(
        browser
            ? Tabs.find((name) => name === page.url.searchParams.get('tab'))
            : undefined,
    );

    const user = getUser();

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
     *  `tab` itself is left alone, so the choice returns if it becomes available. */
    let showing = $derived.by(() => {
        const chosen = tab ?? startingTab;
        return hiddenTabs.includes(Tabs.indexOf(chosen)) ? DefaultTab : chosen;
    });
    let tabIndex = $derived(Tabs.indexOf(showing));

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

    /** Start the list of galleries with the example galleries. */
    let loadedGalleries: Gallery[] = $state([]);

    onMount(async () => {
        nextBatch();
    });

    async function nextBatch() {
        if (firestore === undefined) return firestore;
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
            // The banner (via DB.read) carries the message; leave the list as-is.
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

    let galleries = $derived([...loadedGalleries]);

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
                {#if showing === 'yours'}
                    {#if $user}
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
                            ></Button></p
                        >
                        {#if newGalleryError}
                            <Notice
                                text={(l) =>
                                    l.ui.page.projects.error.newgallery}
                            />
                        {/if}
                        {#if (Galleries.getStatus() === 'loading' || Galleries.getStatus() === 'loggedout') && !Galleries.hydrated}
                            <!-- Only block on the realtime query before the local cache has
                 hydrated. Once hydrated, render the user's cached galleries even
                 if the cloud query is still pending (e.g. offline), rather than
                 spinning forever.

                 We also treat 'loggedout' as "still loading" here: the gallery
                 listener is created once at startup (before auth), so it starts
                 'loggedout', and stays that way until startSync re-runs it for
                 this user. Since we're inside `{#if $user}` the user IS logged
                 in, so a 'loggedout' status is stale, not real — showing the
                 "you must be logged in" notice here flashes it spuriously. -->
                            <Spinning
                                label={(l) => l.ui.widget.loading.message}
                            />
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
                    {:else if $user === undefined || !$authAttempted}
                        <!-- Auth hasn't resolved yet. Show an inline spinner so the "logged
             out" notice doesn't flash for users who turn out to be logged in.
             We gate on `authAttempted` (not just `$user === undefined`) because
             the auth listeners can briefly push a `null` before the restored
             user lands; until Firebase Auth has reported in at least once, a
             null is "still pending", not "logged out". Spinning (not Loading)
             because the header and prompt above are already rendered — same as
             /characters and /localize. -->
                        <Spinning label={(l) => l.ui.widget.loading.message} />
                    {:else}
                        <Notice
                            text={(l) =>
                                l.ui.page.galleries.error.nogalleryedits}
                        />
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
                        <Spinning size={2} />
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
