<script lang="ts">
    import type Project from '../../models/Project';
    import ProjectPreview from './ProjectPreview.svelte';
    import { config } from '../../db/Creator';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';

    export let set: Project[];
    export let previewAction: (project: Project) => void;
    export let editAction: ((project: Project) => void) | undefined = undefined;

    function sortProjects(projects: Project[]): Project[] {
        return projects.sort((a, b) =>
            a.getName().localeCompare(b.getName(), $config.getLanguages())
        );
    }
</script>

<div class="projects">
    {#each sortProjects(set).filter((p) => p.listed) as project (project.id)}
        <ProjectPreview
            {project}
            action={() => previewAction(project)}
            delay={Math.random() * set.length * 50}
            >{#if editAction}<div class="controls"
                    ><Button
                        tip={$config.getLocale().ui.description.editProject}
                        action={() =>
                            editAction ? editAction(project) : undefined}
                        >✎</Button
                    ><ConfirmButton
                        prompt={$config.getLocale().ui.prompt.deleteProject}
                        tip={$config.getLocale().ui.description.deleteProject}
                        action={() => $config.deleteProject(project.id)}
                        >⨉</ConfirmButton
                    ></div
                >{/if}</ProjectPreview
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
        justify-content: center;
        margin: calc(2 * var(--wordplay-spacing));
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>