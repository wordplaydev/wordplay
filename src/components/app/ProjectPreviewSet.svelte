<script lang="ts">
    import type Project from '../../models/Project';
    import ProjectPreview from './ProjectPreview.svelte';
    import { locales } from '../../db/Database';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';

    export let set: Project[];
    export let edit:
        | {
              description: string;
              label: string;
              action: (project: Project) => void;
          }
        | false;
    export let remove: (project: Project) =>
        | {
              description: string;
              prompt: string;
              label: string;
              action: () => void;
          }
        | false;

    function sortProjects(projects: Project[]): Project[] {
        return projects.sort((a, b) =>
            a.getName().localeCompare(b.getName(), $locales.getLanguages())
        );
    }

    $: listed = sortProjects(set).filter((p) => p.isListed());
</script>

<div class="projects">
    {#each listed as project (project.getID())}
        {@const removeMeta = remove(project)}
        <ProjectPreview {project} link={project.getLink(true)}
            ><div class="controls">
                {#if edit}<Button
                        tip={edit.description}
                        action={() => (edit ? edit.action(project) : undefined)}
                        >{edit.label}</Button
                    >{/if}{#if removeMeta}<ConfirmButton
                        prompt={removeMeta.prompt}
                        tip={removeMeta.description}
                        action={() =>
                            removeMeta ? removeMeta.action() : undefined}
                        >{removeMeta.label}</ConfirmButton
                    >{/if}</div
            ><slot /></ProjectPreview
        >
    {/each}
</div>

<style>
    .projects {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
        justify-content: flex-start;
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
