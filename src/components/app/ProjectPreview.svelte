<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { DB } from '../../db/Database';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    export let project: Project;
    export let action: (() => void) | undefined = undefined;
    export let delay: number;

    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator;
    let value: Value | undefined;
    $: [evaluator, value] = updatePreview(project);

    function updatePreview(project: Project): [Evaluator, Value | undefined] {
        const evaluator = new Evaluator(project, DB, false);
        const value = evaluator.getInitialValue();
        evaluator.stop();
        return [evaluator, value];
    }

    let visible = false;
    onMount(() => setTimeout(() => (visible = true), delay));
</script>

<div class="project">
    <div
        role="button"
        class="preview"
        tabindex="0"
        on:pointerdown={(event) =>
            action && event.button === 0 ? action() : undefined}
        on:keydown={(event) =>
            action && (event.key === '' || event.key === 'Enter')
                ? action()
                : undefined}
    >
        {#if visible}
            <div class="output" in:fade role="presentation">
                <OutputView
                    {project}
                    {evaluator}
                    {value}
                    fit={true}
                    grid={false}
                    mini
                    editable={false}
                />
            </div>
        {/if}
    </div>
    <div class="name"
        >{#if project.name.length === 0}<em class="untitled">&mdash;</em>{:else}
            {project.name}{/if}<slot /></div
    >
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

    .output {
        width: 100%;
        height: 100%;
    }

    .name {
        display: flex;
        flex-direction: column;
    }

    .untitled {
        color: var(--wordplay-inactive-color);
    }

    .preview {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .project .preview:hover,
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
