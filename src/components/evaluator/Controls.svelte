<script lang="ts">
    import {
        Pause,
        Play,
        Restart,
        StepBack,
        StepBackInput,
        StepBackNode,
        StepForward,
        StepForwardInput,
        StepForwardNode,
        StepOut,
        StepToPresent,
        StepToStart,
        toShortcut,
    } from '@components/editor/commands/Commands';
    import { getEvaluation } from '@components/project/Contexts';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Switch from '@components/widgets/Switch.svelte';
    import type Evaluator from '@runtime/Evaluator';

    interface Props {
        evaluator: Evaluator;
        /** Show the restart + play/pause buttons (default true) */
        playback?: boolean;
        /** Show the step-through buttons (default true) */
        steps?: boolean;
    }

    let { evaluator, playback = true, steps = true }: Props = $props();

    const evaluation = getEvaluation();
</script>

{#if playback}
    <CommandButton background command={Restart} uiid="timelineReset" />
    <Switch
        on={$evaluation?.playing === true}
        toggle={(play) => (play ? evaluator.play() : evaluator.pause())}
        offTip={Pause.description}
        onTip={Play.description}
        offLabel={Pause.symbol}
        onLabel={Play.symbol}
        uiid="playToggle"
        shortcut={toShortcut(Play)}
    />
{/if}
{#if steps}
    <div class="step-controls" data-uiid="stepControls">
        <CommandButton command={StepToStart} />
        <CommandButton command={StepBackInput} />
        <CommandButton command={StepBackNode} />
        <CommandButton command={StepBack} />
        <CommandButton command={StepOut} />
        <CommandButton command={StepForward} />
        <CommandButton command={StepForwardNode} />
        <CommandButton command={StepForwardInput} />
        <CommandButton command={StepToPresent} />
    </div>
{/if}

<style>
    .step-controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
