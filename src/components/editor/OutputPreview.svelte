<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import OutputView from '@components/output/OutputView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import type Project from '@db/projects/Project';
    import type Source from '@nodes/Source';
    import type Evaluator from '@runtime/Evaluator';
    import ExceptionValue from '@values/ExceptionValue';

    interface Props {
        /** The project whose source output is previewed. */
        project: Project;
        /** The evaluator providing the source's latest value. */
        evaluator: Evaluator;
        /** The source whose output this previews. */
        source: Source;
        /** Whether this source's output is the one currently shown on stage. */
        selected: boolean;
        /** Show this source's output on the stage. */
        select: () => void;
    }

    let { project, evaluator, source, selected, select }: Props = $props();
</script>

<!-- A small toggle that switches the stage to show this source's output. When
     selected it shows the 🎭 stage mask; otherwise a mini preview of the
     source's latest value (red when that value is an exception). -->
<Button
    tip={(l) => l.ui.source.button.selectOutput}
    active={!selected}
    action={select}
    scale={false}
    padding={false}
>
    <div
        class="output-preview"
        class:error={!selected &&
            evaluator.getLatestSourceValue(source) instanceof ExceptionValue}
    >
        {#if selected}
            <span style="font-size:200%"><Emoji text="🎭" /></span>
        {:else}
            <OutputView
                {project}
                {evaluator}
                value={evaluator.getLatestSourceValue(source)}
                mini
                editable={false}
            />
        {/if}
    </div>
</Button>

<style>
    .output-preview {
        width: 2.5em;
        height: 2.5em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        /* Contain the mini output's absolutely-positioned content so it clips
           inside the box instead of the editor code showing through. */
        position: relative;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .output-preview.error {
        background: var(--wordplay-error);
    }
</style>
