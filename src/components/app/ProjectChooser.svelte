<script lang="ts">
    import OutputView from '../output/OutputView.svelte';
    import Settings from '../settings/Settings.svelte';
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';
    import { getProjects } from '../project/Contexts';

    const projects = getProjects();

    function changeProject(example: Project) {
        goto(`/project/${example.id}`);
    }

    function newProject() {
        goto(`/project/${$projects.create()}`);
    }
</script>

<section class="chooser">
    <div class="projects">
        {#each $projects.all() as project}
            <div
                class="project"
                tabIndex="0"
                on:click={() => changeProject(project)}
                on:keydown={(event) =>
                    event.key === '' || event.key === 'Enter'
                        ? changeProject(project)
                        : undefined}
            >
                <div class="preview">
                    <OutputView
                        {project}
                        source={project.main}
                        latest={project.getInitialValue()}
                        fullscreen={false}
                        fit={true}
                        grid={false}
                        mode="mini"
                    />
                </div>
                <div class="name">{project.name}</div>
            </div>
        {/each}
        <div
            class="project add"
            tabIndex="0"
            on:click={newProject}
            on:keydown={(event) =>
                event.key === '' || event.key === 'Enter'
                    ? newProject()
                    : undefined}
        >
            <div class="preview">+</div><div class="name" />
        </div>
    </div></section
>
<div class="footer"><Settings /><a href="/">❌</a></div>

<style>
    .chooser {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--wordplay-spacing);
    }

    .projects {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
    }

    .footer {
        position: fixed;
        bottom: var(--wordplay-spacing);
        right: calc(2 * var(--wordplay-spacing));
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .project {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
        width: 12em;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    :global(.animated) .project {
        transition: transform ease-out;
        transition-duration: 200ms;
    }

    .project:hover,
    .project:focus {
        transform: scale(1.05);
    }

    .preview {
        width: 4rem;
        height: 4rem;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .project.add {
        width: 4em;
        gap: 0;
    }

    .add .preview {
        font-size: 3em;
        text-align: center;
        vertical-align: baseline;
    }
</style>
