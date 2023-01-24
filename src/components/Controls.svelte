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
</script>

<section class="controls">
    <Button
        tip={$preferredTranslations[0].ui.tooltip.reset}
        action={reset}
        enabled={$streams.length > 1}>↻</Button
    >
    <Switch
        on={$playing}
        toggle={(play) =>
            play ? project.evaluator.play() : project.evaluator.pause()}
        offTip={$preferredTranslations[0].ui.tooltip.pause}
        onTip={$preferredTranslations[0].ui.tooltip.play}
        offLabel="⏸️"
        onLabel="▶️"
    />
    <Button
        tip={$preferredTranslations[0].ui.tooltip.start}
        action={() => project.evaluator.stepTo(0)}
        enabled={!project.evaluator.isAtBeginning()}>⇤</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.backInput}
        action={() => project.evaluator.stepBackToInput()}
        enabled={!project.evaluator.isAtBeginning()}>⇠</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.back}
        action={() => project.evaluator.stepBackWithinProgram()}
        enabled={!project.evaluator.isAtBeginning()}>←</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.out}
        action={() => project.evaluator.stepOut()}
        enabled={!playing &&
            $currentStep &&
            project.evaluator.getCurrentEvaluation() !== undefined}>↑</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.forward}
        action={() => project.evaluator.stepWithinProgram()}
        enabled={project.evaluator.isInPast() &&
            $currentStepIndex < project.evaluator.getStepCount()}>→</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.forwardInput}
        action={() => project.evaluator.stepToInput()}
        enabled={project.evaluator.isInPast()}>⇢</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.present}
        action={() => project.evaluator.stepToEnd()}
        enabled={project.evaluator.isInPast()}>⇥</Button
    >
</section>

<style>
    .controls {
        white-space: nowrap;
    }
</style>
