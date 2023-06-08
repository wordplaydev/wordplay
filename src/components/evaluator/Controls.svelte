<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import Switch from '../widgets/Switch.svelte';
    import type Project from '@models/Project';
    import { getEvaluation } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import { creator } from '../../db/Creator';

    export let project: Project;
    export let evaluator: Evaluator;

    const evaluation = getEvaluation();

    function reset() {
        $creator.reviseProject(project, project.clone());
    }
</script>

<Button tip={$creator.getLocale().ui.tooltip.reset} action={reset}>↻</Button>
<Switch
    on={$evaluation?.playing === true}
    toggle={(play) => (play ? evaluator.play() : evaluator.pause())}
    offTip={$creator.getLocale().ui.tooltip.pause}
    onTip={$creator.getLocale().ui.tooltip.play}
    offLabel="⏸️"
    onLabel="▶️"
/>
<Button
    tip={$creator.getLocale().ui.tooltip.start}
    action={() => evaluator.stepTo(0)}
    enabled={!evaluator.isAtBeginning()}>⇤</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.backInput}
    action={() => evaluator.stepBackToInput()}
    enabled={!evaluator.isAtBeginning()}>⇠</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.back}
    action={() => evaluator.stepBackWithinProgram()}
    enabled={!evaluator.isAtBeginning()}>←</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.out}
    action={() => evaluator.stepOut()}
    enabled={$evaluation?.playing === false &&
        $evaluation?.step !== undefined &&
        evaluator.getCurrentEvaluation() !== undefined}>↑</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.forward}
    action={() => evaluator.stepWithinProgram()}
    enabled={evaluator.isInPast() &&
        $evaluation?.stepIndex !== undefined &&
        $evaluation.stepIndex < evaluator.getStepCount()}>→</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.forwardInput}
    action={() => evaluator.stepToInput()}
    enabled={!evaluator.isInPast()}>⇢</Button
>
<Button
    tip={$creator.getLocale().ui.tooltip.present}
    action={() => evaluator.stepToEnd()}
    enabled={!evaluator.isInPast()}>⇥</Button
>
