<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { onMount } from 'svelte';
    import type Gallery from '@db/galleries/Gallery';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Link from '@components/app/Link.svelte';
    import PreviewPlaceholder from '@components/app/PreviewPlaceholder.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
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

    // The template chooses its own plural form from this count; see plurals.ts.
    let countInputs = $derived({ count: gallery.getProjects().length });

    // Rotate through the gallery's projects every 4 seconds. The rotation
    // is a feature, not a workaround — it gives the card visual rhythm and
    // showcases multiple projects from the gallery without taking extra
    // space. The first project is shown immediately on mount so the tile
    // renders its (glyph-ready) preview right away instead of sitting on a
    // spinner; only the *rotation* start is offset by a random amount up to
    // the interval, so that when several GalleryPreview tiles render together
    // (e.g. on /galleries) they don't all flip at once. The unmount guard is
    // needed because `Projects.get(...)` is async (potentially hitting
    // Firestore), so a fetch that resolves after unmount mustn't write to
    // `project` ($state belongs to a now-destroyed effect).
    const ROTATION_MS = 4000;

    /** The size, in rem, of the preview tile (and of its empty-state placeholder). */
    const PREVIEW_SIZE = 6;

    onMount(() => {
        let unmounted = false;
        let timeoutID: NodeJS.Timeout | undefined;
        let index = 0;

        async function show(i: number) {
            const projects = gallery.getProjects();
            if (projects.length === 0) return;
            const next = await Projects.get(projects[i]);
            if (unmounted) return;
            project = next;
        }

        async function rotate() {
            if (unmounted) return;
            const projects = gallery.getProjects();
            if (projects.length > 0) {
                index = (index + 1) % projects.length;
                await show(index);
            }
            timeoutID = setTimeout(rotate, ROTATION_MS);
        }

        // Render the first project immediately, then stagger the start of
        // rotation so tiles don't all advance in unison.
        show(0);
        timeoutID = setTimeout(rotate, Math.random() * ROTATION_MS);
        return () => {
            unmounted = true;
            if (timeoutID !== undefined) clearTimeout(timeoutID);
        };
    });
</script>

<div class="gallery">
    <div class="previews">
        {#if gallery.getProjects().length === 0 || project === undefined}
            <!-- No project to show: hold the tile's space with a dashed
                 outline, so cards with and without projects line up. -->
            <PreviewPlaceholder size={PREVIEW_SIZE} loading={false} />
            <!-- The `!browser` guard keeps ProjectPreview off the server, since we
                 haven't structured the project database to run server side fetches
                 and SvelteKit builds fail. The placeholder holds the tile's space
                 there instead, so the card doesn't shift when the tile mounts. -->
        {:else if !browser || project === null}
            <PreviewPlaceholder size={PREVIEW_SIZE} />
        {:else}
            <ProjectPreview
                {project}
                name={false}
                action={() => (project ? goto(gallery.getLink()) : undefined)}
                size={PREVIEW_SIZE}
                link={gallery.getLink()}
            />
        {/if}
    </div>
    <div class="description">
        <Subheader compact
            ><Link to={gallery.getLink()}>{gallery.getName($locales)}</Link>
            <sup class="count"
                ><MarkupHTMLView
                    inline
                    markup={[(l) => l.ui.gallery.projects, countInputs]}
                /></sup
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

    /* The gallery name (a Subheader) is `white-space: nowrap` by default,
       which makes long names overflow the card. Let it wrap within the card. */
    .description > :global(h2) {
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .count {
        color: var(--wordplay-foreground);
        white-space: nowrap;
        font-size: var(--wordplay-small-font-size);
    }

    .previews {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
