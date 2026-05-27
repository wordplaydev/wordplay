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
    }

    let { gallery }: Props = $props();

    /** The project currently shown in the tile. `null` while we're awaiting
     *  the first `Projects.get(...)`; `undefined` after a fetch that
     *  couldn't resolve a project. */
    let project: Project | null | undefined = $state(null);

    let description = $derived(
        gallery.getDescription($locales).split('\n').join('\n\n'),
    );

    // Rotate through the gallery's projects every 4 seconds. The rotation
    // is a feature, not a workaround — it gives the card visual rhythm and
    // showcases multiple projects from the gallery without taking extra
    // space. The first tick is offset by a random amount up to the
    // rotation interval so that, when several GalleryPreview tiles render
    // together (e.g. on /galleries), they don't all flip at once. The
    // unmount guard is needed because `Projects.get(...)` is async
    // (potentially hitting Firestore), so a fetch that resolves after
    // unmount mustn't write to `project` ($state belongs to a now-
    // destroyed effect).
    const ROTATION_MS = 4000;
    onMount(() => {
        let unmounted = false;
        let timeoutID: NodeJS.Timeout | undefined;
        let index = 0;

        async function loadNext() {
            if (unmounted) return;
            const projects = gallery.getProjects();
            if (projects.length > 0) {
                index = (index + 1) % projects.length;
                const next = await Projects.get(projects[index]);
                if (unmounted) return;
                project = next;
            }
            timeoutID = setTimeout(loadNext, ROTATION_MS);
        }

        timeoutID = setTimeout(loadNext, Math.random() * ROTATION_MS);
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
