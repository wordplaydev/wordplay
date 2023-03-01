<script lang="ts">
    import { examples, makeProject, type Stuff } from '../../examples/examples';
    import type Value from '@runtime/Value';
    import OutputView from '../output/OutputView.svelte';
    import Settings from '../settings/Settings.svelte';
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';

    let verses = new Map<string, [Project, Value | undefined]>();
    for (const example of examples) {
        const project = makeProject(example);
        project.evaluate();
        project.evaluator.pause();
        const value = project.evaluator.getLatestSourceValue(project.main);
        verses.set(example.name, [project, value]);
    }

    function changeProject(example: Stuff) {
        goto(`/project/${example.name}`);
    }

    function newProject() {
        goto(`/project/new`);
    }
</script>

<section class="chooser">
    <div class="projects">
        {#each examples as example}
            {@const preview = verses.get(example.name)}
            <div
                class="project"
                tabIndex="0"
                on:click={() => changeProject(example)}
                on:keydown={(event) =>
                    event.key === '' || event.key === 'Enter'
                        ? changeProject(example)
                        : undefined}
            >
                {#if preview}
                    <div class="preview">
                        <OutputView
                            project={preview[0]}
                            source={preview[0].main}
                            latest={preview[1]}
                            fullscreen={false}
                            fit={true}
                            grid={false}
                            mode="mini"
                        />
                    </div>
                {/if}
                <div class="name">{example.name}</div>
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
    </div><div class="footer"
        ><span class="settings"><Settings /></span><a href="/">❌</a></div
    ></section
>

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
        margin-top: auto;
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .settings {
        margin-left: auto;
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
