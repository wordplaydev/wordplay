<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { DB, locales } from '../../db/Database';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import getProjectLink from './getProjectLink';

    export let project: Project;
    export let action: (() => void) | undefined = undefined;
    export let delay: number;
    export let name = true;

    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator;
    let value: Value | undefined;
    $: if (visible) {
        [evaluator, value] = updatePreview(project);
    }

    function updatePreview(project: Project): [Evaluator, Value | undefined] {
        const evaluator = new Evaluator(project, DB, $locales, false);
        const value = evaluator.getInitialValue();
        evaluator.stop();
        return [evaluator, value];
    }

    // Don't show the output view immediately.
    let visible = false;
    onMount(() => setTimeout(() => (visible = true), delay));
</script>

<div class="project" class:named={name}>
    <a
        class="preview"
        href={getProjectLink(project, true)}
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
    </a>
    {#if name}
        <div class="name"
            >{#if project.name.length === 0}<em class="untitled">&mdash;</em
                >{:else}
                {project.name}{/if}<slot /></div
        >{/if}
</div>

<style>
    .project {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .project.named {
        width: 12em;
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
