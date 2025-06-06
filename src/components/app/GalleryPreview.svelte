<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { onMount } from 'svelte';
    import type Gallery from '../../db/galleries/Gallery';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Link from './Link.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import Spinning from './Spinning.svelte';
    import Subheader from './Subheader.svelte';

    interface Props {
        gallery: Gallery;
        /** How many milliseconds to wait to start updating */
        delay: number;
    }

    let { gallery, delay }: Props = $props();

    let index = $state(0);
    let projectID = $state<string | undefined>(gallery.getProjects()[0]);

    /** Null means loading */
    let project: Project | null | undefined = $state(null);
    let timeoutID: NodeJS.Timeout;

    let description = $derived(
        gallery.getDescription($locales).split('\n').join('\n\n'),
    );

    async function loadNext() {
        index = (index + 1) % gallery.getProjects().length;
        projectID = gallery.getProjects()[index];
        if (projectID) project = await Projects.get(projectID);
        timeoutID = setTimeout(loadNext, 10000);
    }

    onMount(() => {
        setTimeout(loadNext, delay);

        return () =>
            timeoutID !== undefined ? clearTimeout(timeoutID) : undefined;
    });
</script>

<div class="gallery">
    <!-- We have to guard this since we haven't structured the project database to run server side fetches, so SvelteKit builds fail. -->
    {#if browser && project !== undefined}
        <div class="previews">
            {#if gallery.getProjects().length === 0}
                &mdash;
            {:else if project === null}
                <Spinning large label={(l) => l.ui.widget.loading.message} />
            {:else}
                <ProjectPreview
                    {project}
                    name={false}
                    action={() =>
                        project ? goto(gallery.getLink()) : undefined}
                    size={8}
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
                : `/${$locales.get((l) => l.ui.gallery.undescribed)}/`}
        />
    </div>
</div>

<style>
    .gallery {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        margin-block-start: 2em;
        gap: var(--wordplay-spacing);
        align-items: top;
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
        width: 8em;
        height: 8em;
    }
</style>
