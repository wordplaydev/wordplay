<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@runtime/Value';
    import { preferredTranslations } from '../../translation/translations';

    export let project: Project;
    export let action: (() => void) | undefined = undefined;

    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator;
    let value: Value | undefined;
    $: {
        evaluator = new Evaluator(project, undefined, false);
        value = evaluator.getInitialValue();
        evaluator.stop();
    }
</script>

<div class="project">
    <div
        class="preview"
        tabIndex="0"
        on:pointerdown={action}
        on:keydown={(event) =>
            action && (event.key === '' || event.key === 'Enter')
                ? action()
                : undefined}
    >
        <OutputView
            {project}
            {evaluator}
            source={project.main}
            latest={value}
            fullscreen={false}
            fit={true}
            grid={false}
            mini
        />
    </div>
    <div class="name"
        >{#if project.name.length === 0}<em class="untitled"
                >{$preferredTranslations[0].ui.placeholders.project}</em
            >{:else}
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

    .name {
        display: flex;
        flex-direction: column;
    }

    .untitled {
        color: var(--wordplay-disabled-color);
    }

    .preview {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
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
