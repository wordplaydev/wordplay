<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import type Value from '@runtime/Value';

    export let project: Project;
    export let action: () => void;

    // Clone the project and get its initial value, then stop the project's evaluator.
    let value: Value | undefined;
    $: {
        const clone = project.clone();
        value = clone.getInitialValue();
        clone.cleanup();
    }
</script>

<div class="project">
    <div
        class="preview"
        tabIndex="0"
        on:click={action}
        on:keydown={(event) =>
            event.key === '' || event.key === 'Enter' ? action() : undefined}
    >
        <OutputView
            {project}
            source={project.main}
            latest={value}
            fullscreen={false}
            fit={true}
            grid={false}
            mode="mini"
        />
    </div>
    <div class="name">{project.name}<slot /></div>
</div>

<style>
    .project {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        width: 12em;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .name {
        display: flex;
        flex-direction: column;
    }

    :global(.animated) .preview {
        transition: transform ease-out;
        transition-duration: 200ms;
    }

    .project:hover,
    .project:focus .preview {
        transform: scale(1.05);
    }

    .preview {
        cursor: pointer;
        width: 4rem;
        height: 4rem;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
