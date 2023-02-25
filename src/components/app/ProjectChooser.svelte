<script lang="ts">
    import { examples, makeProject, type Stuff } from '../../examples/examples';
    import Project from '../../models/Project';
    import { updateProject } from '../../models/stores';
    import Source from '@nodes/Source';
    import type Value from '@runtime/Value';
    import OutputView from '../output/OutputView.svelte';

    let verses = new Map<string, [Project, Value | undefined]>();
    for (const example of examples) {
        const project = makeProject(example);
        project.evaluate();
        project.evaluator.pause();
        const value = project.evaluator.getLatestSourceValue(project.main);
        verses.set(example.name, [project, value]);
    }

    function changeProject(example: Stuff) {
        updateProject(makeProject(example));
    }

    function newProject() {
        updateProject(new Project('—', Source.make('—'), []));
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
            class="project"
            tabIndex="0"
            on:click={newProject}
            on:keydown={(event) =>
                event.key === '' || event.key === 'Enter'
                    ? newProject()
                    : undefined}
        >
            <div class="add">+</div>
        </div>
    </div>
</section>

<style>
    .chooser {
        padding: calc(4 * var(--wordplay-spacing));
        width: 100vw;
        height: 100vh;

        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }

    .projects {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .project {
        margin: var(--wordplay-spacing);
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
        transition: transform 0.25s ease-out;
        width: 10em;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .project:hover,
    .project:focus {
        transform: scale(1.05);
    }

    .preview {
        width: 4em;
        height: 4em;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .add {
        text-align: center;
        font-size: xx-large;
        width: 1.5em;
    }
</style>
