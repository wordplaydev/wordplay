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

    export let gallery: Gallery;

    const Count = 3;

    /** Projects in the gallery to highlight */
    $: highlights = gallery.getProjects().slice(0, Count);
    $: hidden = Math.max(0, gallery.getProjects().length - Count);
</script>

<div class="gallery">
    <Link to={`gallery/${gallery.getID()}`}
        ><Subheader>{gallery.getName($locales.getLocale())}</Subheader></Link
    >
    <MarkupHtmlView
        markup={gallery
            .getDescription($locales.getLocale())
            .split('\n')
            .join('\n\n')}
    />
    <!-- We have to guard this since we haven't structured the project database to run server side fetches, so SvelteKit builds fail. -->
    {#if browser}
        <div class="previews">
            {#each highlights as projectID, index}
                <div class="highlight">
                    {#await Projects.get(projectID)}
                        <Spinning
                            label={$locales.get(
                                (l) => l.ui.widget.loading.message
                            )}
                        />
                    {:then project}
                        {#if project}
                            <ProjectPreview
                                {project}
                                name={false}
                                action={() =>
                                    goto(getProjectLink(project, true))}
                                delay={index * 300}
                            />
                        {/if}
                    {/await}
                </div>
            {/each}
            {#if hidden > 0}{'•'.repeat(hidden)}{/if}
        </div>
    {/if}
</div>

<style>
    .gallery {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        margin-block-end: 2em;
    }

    .previews {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }
</style>
