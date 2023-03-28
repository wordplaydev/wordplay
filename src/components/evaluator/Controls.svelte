<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import Switch from '../widgets/Switch.svelte';
    import type Project from '@models/Project';
    import { preferredTranslations } from '@translation/translations';
    import { getEvaluation, getProjects } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';

    export let project: Project;
    export let evaluator: Evaluator;

    const projects = getProjects();
    const evaluation = getEvaluation();

    function reset() {
        $projects.revise(project, project.clone());
    }
</script>

<div class="controls">
    <Button
        tip={$preferredTranslations[0].ui.tooltip.reset}
        action={reset}
        enabled={$evaluation?.streams !== undefined &&
            $evaluation.streams.length > 1}>↻</Button
    >
    <Switch
        on={$evaluation?.playing === true}
        toggle={(play) => (play ? evaluator.play() : evaluator.pause())}
        offTip={$preferredTranslations[0].ui.tooltip.pause}
        onTip={$preferredTranslations[0].ui.tooltip.play}
        offLabel="⏸️"
        onLabel="▶️"
    />
    <Button
        tip={$preferredTranslations[0].ui.tooltip.start}
        action={() => evaluator.stepTo(0)}
        enabled={!evaluator.isAtBeginning()}>⇤</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.backInput}
        action={() => evaluator.stepBackToInput()}
        enabled={!evaluator.isAtBeginning()}>⇠</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.back}
        action={() => evaluator.stepBackWithinProgram()}
        enabled={!evaluator.isAtBeginning()}>←</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.out}
        action={() => evaluator.stepOut()}
        enabled={$evaluation?.playing === false &&
            $evaluation?.step !== undefined &&
            evaluator.getCurrentEvaluation() !== undefined}>↑</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.forward}
        action={() => evaluator.stepWithinProgram()}
        enabled={evaluator.isInPast() &&
            $evaluation?.stepIndex !== undefined &&
            $evaluation.stepIndex < evaluator.getStepCount()}>→</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.forwardInput}
        action={() => evaluator.stepToInput()}
        enabled={!evaluator.isInPast()}>⇢</Button
    >
    <Button
        tip={$preferredTranslations[0].ui.tooltip.present}
        action={() => evaluator.stepToEnd()}
        enabled={!evaluator.isInPast()}>⇥</Button
    >
</div>

<style>
    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }
</style>
