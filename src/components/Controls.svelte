<script lang="ts">
    import {
        playing,
        updateProject,
        streams,
        currentStep,
        currentStepIndex,
    } from '../models/stores';

    import Button from './Button.svelte';
    import Switch from './Switch.svelte';
    import type Project from '../models/Project';
    import { preferredTranslations } from '../translation/translations';

    export let project: Project;

    function reset() {
        updateProject(project.clone());
    }

    function handleStep() {
        project.evaluator.stepWithinProgram();
    }

    function handleStepOut() {
        project.evaluator.stepOut();
    }

    function playPause(play: boolean) {
        if (play) project.evaluator.play();
        else project.evaluator.pause();
    }
</script>

<section class="controls">
    <Button
        tip={$preferredTranslations[0].ui.tooltip.reset}
        action={reset}
        enabled={$streams.length > 1}>↻</Button
    >
    <Switch
        on={$playing}
        toggle={playPause}
        offTip={$preferredTranslations[0].ui.tooltip.pause}
        onTip={$preferredTranslations[0].ui.tooltip.play}
        offLabel="||"
        onLabel="▷"
    />
    {#if !$playing}
        <Button
            tip="{$preferredTranslations[0].ui.tooltip.back},"
            action={() => project.evaluator.stepBackWithinProgram()}
            enabled={!$playing && !project.evaluator.isAtBeginning()}>←</Button
        >
        <Button
            tip={$preferredTranslations[0].ui.tooltip.out}
            action={handleStepOut}
            enabled={!$playing &&
                $currentStep &&
                project.evaluator.getCurrentEvaluation() !== undefined}
            >↑</Button
        >
        <Button
            tip={$preferredTranslations[0].ui.tooltip.forward}
            action={handleStep}
            enabled={!$playing &&
                $currentStepIndex < project.evaluator.getStepCount()}>→</Button
        >
        <Button
            tip={$preferredTranslations[0].ui.tooltip.present}
            action={() => project.evaluator.play()}
            enabled={$streams.length > 1}>⇥</Button
        >
    {/if}
</section>

<style>
    .controls {
        white-space: nowrap;
    }
</style>
