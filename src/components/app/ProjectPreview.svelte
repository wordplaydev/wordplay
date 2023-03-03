<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';

    export let project: Project;
    export let action: () => void;
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
            latest={project.getInitialValue()}
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
        cursor: pointer;
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
</style>
