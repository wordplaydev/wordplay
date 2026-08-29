<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import { DB, disconnected, locales } from '@db/Database';
    import { firestore } from '@db/firebase';
    import type { SerializedGallery } from '@db/galleries/Gallery';
    import Gallery, { upgradeGallery } from '@db/galleries/Gallery';
    import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
    import moderate from '@db/moderation/moderate';
    import {
        getFlagDescription,
        unknownFlags,
        withFlag,
        type ModerationState,
    } from '@db/projects/Moderation';
    import type Project from '@db/projects/Project';
    import { localeGoto } from '@util/localeGoto';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        where,
    } from 'firebase/firestore';
    import { onMount } from 'svelte';

    /** How many pending galleries to look at when finding the next one, so a
     *  moderator can pass on several in a row without re-querying each time. */
    const PendingPerLook = 20;

    /** The queue, oldest id first. Held in memory so skipping is instant and
     *  doesn't need a cursor: a decision removes a gallery from `pending`
     *  server-side, so the next look never brings back what was decided. */
    let queue = $state<Gallery[] | undefined>(undefined);
    /** Galleries this moderator passed on. Kept in memory rather than written
     *  anywhere, since passing on something isn't the same as deciding it. */
    let skipped: Set<string> = $state(new Set());
    let saving = $state(false);
    let failed = $state(false);

    let gallery: Gallery | undefined = $derived(
        queue?.find((g) => !skipped.has(g.getID())),
    );

    let flags: ModerationState = $state(unknownFlags());
    // A fresh decision starts from no findings: the flags on the gallery are
    // whatever a previous decision left, and carrying them forward would
    // pre-check boxes this moderator hasn't looked at.
    $effect(() => {
        gallery?.getID();
        flags = unknownFlags();
    });

    let projects = $state<Project[] | undefined>(undefined);
    $effect(() => {
        const showing = gallery;
        if (showing === undefined) {
            projects = undefined;
            return;
        }
        projects = undefined;
        DB.loadProjects()
            .then((db) =>
                Promise.all(showing.getProjects().map((id) => db.get(id))),
            )
            .then((loaded) => {
                // Another gallery may have come up while these were loading.
                if (gallery?.getID() === showing.getID())
                    projects = loaded.filter(
                        (p): p is Project => p !== undefined,
                    );
            });
    });

    onMount(() => {
        look();
    });

    async function look() {
        if (firestore === undefined) {
            queue ??= [];
            return;
        }
        try {
            const pending = await DB.read(
                getDocs(
                    query(
                        collection(firestore, GalleriesCollection),
                        where('moderation', '==', 'pending'),
                        orderBy('id'),
                        limit(PendingPerLook),
                    ),
                ),
            );
            queue = pending.docs.map(
                (snap) =>
                    new Gallery(
                        upgradeGallery(snap.data() as SerializedGallery),
                    ),
            );
        } catch (_) {
            // DB.read raises the site-wide connection banner; settle the list so
            // the spinner gives way rather than showing forever.
            queue ??= [];
        }
    }

    async function decide(decision: 'approved' | 'denied') {
        const deciding = gallery;
        if (deciding === undefined) return;
        saving = true;
        failed = false;
        try {
            await moderate({
                kind: 'gallery',
                subject: deciding.getID(),
                listing: decision,
                // A gallery has no author, so there is nobody to warn.
                strike: false,
                decision: `gallery-${deciding.getID()}-${decision}`,
                // Nulls mean "not looked at" on a project; a decision has looked
                // at all of them, so an unchecked box is a finding of no.
                flags: Object.fromEntries(
                    Object.entries(flags).map(([flag, state]) => [
                        flag,
                        state === true,
                    ]),
                ),
            });
            queue = queue?.filter((g) => g.getID() !== deciding.getID());
        } catch (error) {
            console.error(error);
            failed = true;
        } finally {
            saving = false;
        }
    }
</script>

<div class="queue">
    <div class="decision">
        <Header text={(l) => l.moderation.moderate.header} />
        {#if queue === undefined}
            <Spinning />
        {:else if gallery === undefined}
            <MarkupHTMLView markup={(l) => l.moderation.gallery.done} />
        {:else}
            <MarkupHTMLView markup={(l) => l.moderation.gallery.explain} />
            {#each Object.entries(flags) as [flag, state]}
                <div class="flag">
                    <Checkbox
                        label={(l) => l.moderation.button.property}
                        on={state === null ? undefined : state}
                        id={`gallery-${flag}`}
                        changed={(value) =>
                            (flags = withFlag(flags, flag, value === true))}
                    />
                    <label for={`gallery-${flag}`}>
                        <MarkupHTMLView
                            markup={getFlagDescription(flag, $locales) ?? ''}
                        /></label
                    >
                </div>
            {/each}
            {#if failed}
                <Notice text={(l) => l.moderation.error.notmod} />
            {/if}
            <div class="controls">
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={(l) => l.moderation.gallery.approve.tip}
                    label={(l) => l.moderation.gallery.approve.label}
                    action={() => decide('approved')}
                    testid="gallery-approve"
                />
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={(l) => l.moderation.gallery.deny.tip}
                    label={(l) => l.moderation.gallery.deny.label}
                    action={() => decide('denied')}
                    testid="gallery-deny"
                />
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={(l) => l.moderation.gallery.skip.tip}
                    label={(l) => l.moderation.gallery.skip.label}
                    action={() => {
                        skipped = new Set([...skipped, gallery?.getID() ?? '']);
                    }}
                />
            </div>
        {/if}
    </div>
    <div class="content">
        {#if gallery === undefined}
            <div class="big">✔</div>
        {:else}
            <Subheader wrap>{gallery.getName($locales)}</Subheader>
            <MarkupHTMLView markup={gallery.getDescription($locales)} />
            {#if projects === undefined}
                <Spinning />
            {:else}
                <ProjectPreviewSet
                    set={projects}
                    anonymize={false}
                    edit={{
                        description: (l) =>
                            l.ui.page.projects.button.viewproject,
                        action: (project) => localeGoto(project.getLink(false)),
                        label: '👁️',
                    }}
                    remove={() => false}
                    copy={false}
                />
            {/if}
        {/if}
    </div>
</div>

<style>
    .queue {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
    }

    .decision {
        width: 25vw;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-inline-end: var(--wordplay-focus-width) solid
            var(--wordplay-border-color);
        overflow-x: hidden;
        overflow-y: auto;
    }

    .content {
        flex: 1;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
    }

    .flag {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: normal;
        font-size: medium;
    }

    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .big {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        font-size: 120pt;
    }
</style>
