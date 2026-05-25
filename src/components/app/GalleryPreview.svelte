<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { onMount } from 'svelte';
    import type Gallery from '@db/galleries/Gallery';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Link from '@components/app/Link.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';

    interface Props {
        gallery: Gallery;
        /** How many milliseconds to wait to start updating */
        delay: number;
    }

    let { gallery, delay }: Props = $props();

    let index = $state(0);

    /** Null means loading */
    let project: Project | null | undefined = $state(null);
    let timeoutID: NodeJS.Timeout | undefined;
    // Set to true on unmount so the in-flight `Projects.get` doesn't write to
    // `project` (a `$state` that no longer belongs to a live effect) and
    // doesn't schedule the next tick. Without this, navigating away from a
    // page with galleries triggers Svelte's `derived_inert` warning.
    let unmounted = false;

    let description = $derived(
        gallery.getDescription($locales).split('\n').join('\n\n'),
    );

    async function loadNext() {
        if (unmounted) return;
        const projects = gallery.getProjects();
        if (projects.length === 0) return;
        index = (index + 1) % projects.length;
        const id = projects[index];
        if (id) {
            const next = await Projects.get(id);
            if (unmounted) return;
            project = next;
        }
        timeoutID = setTimeout(loadNext, 10000);
    }

    onMount(() => {
        timeoutID = setTimeout(loadNext, delay);

        return () => {
            unmounted = true;
            if (timeoutID !== undefined) clearTimeout(timeoutID);
        };
    });
</script>

<div class="gallery">
    <!-- We have to guard this since we haven't structured the project database to run server side fetches, so SvelteKit builds fail. -->
    {#if browser && project !== undefined}
        <div class="previews">
            {#if gallery.getProjects().length === 0}
                &mdash;
            {:else if project === null}
                <Spinning size={6} label={(l) => l.ui.widget.loading.message} />
            {:else}
                <ProjectPreview
                    {project}
                    name={false}
                    action={() =>
                        project ? goto(gallery.getLink()) : undefined}
                    size={6}
                    link={gallery.getLink()}
                />
            {/if}
        </div>
    {/if}
    <div class="description">
        <Subheader compact
            ><Link nowrap to={gallery.getLink()}
                >{gallery.getName($locales)}</Link
            >
            <sub
                ><span class="dots"
                    >{'•'.repeat(gallery.getProjects().length)}</span
                ></sub
            ></Subheader
        >
        <MarkupHTMLView
            markup={description.length > 0
                ? description
                : (l) => l.ui.gallery.undescribed}
        />
    </div>
</div>

<style>
    .gallery {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        margin-block-start: 1em;
        gap: var(--wordplay-spacing);
    }

    .dots {
        color: var(--wordplay-foreground);
        font-size: xx-large;
    }

    .previews {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
