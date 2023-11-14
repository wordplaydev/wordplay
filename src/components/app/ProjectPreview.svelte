<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { DB, animationDuration, locales } from '../../db/Database';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { isAudience, isFlagged } from '../../models/Moderation';
    import { getUser } from '../project/Contexts';

    export let project: Project;
    export let action: (() => void) | undefined = undefined;
    export let delay: number;
    export let name = true;
    export let size = 4;
    export let link: string | undefined = undefined;

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

    const user = getUser();

    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    $: audience = isAudience($user, project);
</script>

<div class="project" class:named={name}>
    <a
        class="preview"
        style:width={`${size}rem`}
        style:height={`${size}rem`}
        href={link ?? project.getLink(true)}
        on:click={(event) =>
            action && event.button === 0 ? action() : undefined}
        on:keydown={(event) =>
            action && (event.key === '' || event.key === 'Enter')
                ? action()
                : undefined}
    >
        {#if visible}
            <div
                class="output"
                role="presentation"
                class:blurred={audience && isFlagged(project.getFlags())}
                in:fade={{ duration: $animationDuration }}
            >
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
            >{#if project.getName().length === 0}<em class="untitled"
                    >&mdash;</em
                >{:else}
                {project.getName()}{/if}<slot /></div
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
        background: var(--wordplay-inactive-color);
    }

    .project .preview:hover,
    .project:focus .preview {
        transform: scale(1.05);
    }

    .preview {
        cursor: pointer;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .blurred {
        filter: blur(10px);
    }
</style>
