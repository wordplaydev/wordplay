<script lang="ts">
    import { goto } from '$app/navigation';
    import { Projects, locales } from '@db/Database';
    import type Gallery from '../../models/Gallery';
    import Link from './Link.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import Spinning from './Spinning.svelte';
    import Subheader from './Subheader.svelte';
    import getProjectLink from './getProjectLink';
    import { browser } from '$app/environment';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import { onMount } from 'svelte';
    import type Project from '@models/Project';

    export let gallery: Gallery;

    let index = 0;
    let projectID = gallery.getProjects()[0];
    let project: Project | undefined = undefined;
    let timeoutID: NodeJS.Timeout;

    async function loadNext() {
        index = (index + 1) % gallery.getProjects().length;
        projectID = gallery.getProjects()[index];
        if (projectID) project = await Projects.get(projectID);
        timeoutID = setTimeout(loadNext, Math.random() * 3000 + 3000);
    }

    onMount(() => {
        loadNext();

        return () =>
            timeoutID !== undefined ? clearTimeout(timeoutID) : undefined;
    });
</script>

<div class="gallery">
    <!-- We have to guard this since we haven't structured the project database to run server side fetches, so SvelteKit builds fail. -->
    {#if browser}
        <div class="previews">
            {#if project === undefined}
                <Spinning
                    label={$locales.get((l) => l.ui.widget.loading.message)}
                />
            {:else}
                <ProjectPreview
                    {project}
                    name={false}
                    action={() =>
                        project
                            ? goto(getProjectLink(project, true))
                            : undefined}
                    delay={Math.random() * 1000}
                    size={8}
                />
            {/if}
        </div>
    {/if}
    <div class="description">
        <Link to={`gallery/${gallery.getID()}`}
            ><Subheader
                >{gallery.getName($locales)}
                <sub
                    ><span class="dots"
                        >{'•'.repeat(gallery.getProjects().length)}</span
                    ></sub
                ></Subheader
            ></Link
        >
        <MarkupHtmlView
            markup={gallery.getDescription($locales).split('\n').join('\n\n')}
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
